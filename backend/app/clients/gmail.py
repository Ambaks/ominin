import base64
from email.message import EmailMessage
from functools import lru_cache

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


@lru_cache(maxsize=1)
def _service():
    credentials = Credentials(
        token=None,
        refresh_token=settings.gmail_refresh_token,
        client_id=settings.gmail_client_id,
        client_secret=settings.gmail_client_secret,
        token_uri=TOKEN_URI,
        scopes=SCOPES,
    )
    return build("gmail", "v1", credentials=credentials, cache_discovery=False)


def send(
    to: str,
    subject: str,
    body: str,
    headers: dict[str, str] | None = None,
    thread_id: str | None = None,
) -> dict:
    """Send a plain-text email. Returns {id, threadId}."""
    message = EmailMessage()
    message["To"] = to
    message["From"] = f'"{settings.gmail_sender_name}" <{settings.gmail_sender_email}>'
    message["Subject"] = subject
    for name, value in (headers or {}).items():
        message[name] = value
    message.set_content(body)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    payload: dict = {"raw": raw}
    if thread_id:
        payload["threadId"] = thread_id
    return _service().users().messages().send(userId="me", body=payload).execute()


def list_inbox(newer_than_days: int, max_results: int) -> list[dict]:
    """Message stubs ({id, threadId}) for recent inbound mail."""
    result = (
        _service()
        .users()
        .messages()
        .list(
            userId="me",
            q=f"in:inbox -from:me newer_than:{newer_than_days}d",
            maxResults=max_results,
        )
        .execute()
    )
    return result.get("messages", [])


def get_message(message_id: str) -> dict:
    return (
        _service()
        .users()
        .messages()
        .get(userId="me", id=message_id, format="full")
        .execute()
    )


def extract_headers(message: dict) -> dict[str, str]:
    return {
        h["name"].lower(): h["value"]
        for h in message.get("payload", {}).get("headers", [])
    }


def extract_body_text(message: dict) -> str:
    """Walk MIME parts for text/plain; fall back to stripped text/html."""

    def decode(part: dict) -> str:
        data = part.get("body", {}).get("data")
        if not data:
            return ""
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    def walk(part: dict, mime: str) -> str:
        if part.get("mimeType", "").startswith(mime):
            return decode(part)
        for child in part.get("parts", []):
            found = walk(child, mime)
            if found:
                return found
        return ""

    payload = message.get("payload", {})
    text = walk(payload, "text/plain")
    if text:
        return text
    html = walk(payload, "text/html")
    if html:
        import re

        return re.sub(r"<[^>]+>", " ", html)
    return ""
