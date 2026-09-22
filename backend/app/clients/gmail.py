import base64
from email.message import EmailMessage
from functools import lru_cache

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
TOKEN_URI = "https://oauth2.googleapis.com/token"

_label_cache: dict[str, str] = {}


def build_service(
    refresh_token: str, client_id: str, client_secret: str, scopes: list[str]
):
    """Gmail API client for any mailbox whose refresh token we hold.

    Every function below defaults to Léa's own mailbox (settings); the
    Agents product passes the service built for its client's mailbox."""
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri=TOKEN_URI,
        scopes=scopes,
    )
    return build("gmail", "v1", credentials=credentials, cache_discovery=False)


@lru_cache(maxsize=1)
def _service():
    return build_service(
        settings.gmail_refresh_token,
        settings.gmail_client_id,
        settings.gmail_client_secret,
        SCOPES,
    )


def send(
    to: str,
    subject: str,
    body: str,
    headers: dict[str, str] | None = None,
    thread_id: str | None = None,
    *,
    service=None,
    sender: str | None = None,
) -> dict:
    """Send a plain-text email. Returns {id, threadId}."""
    message = EmailMessage()
    message["To"] = to
    message["From"] = (
        sender or f'"{settings.gmail_sender_name}" <{settings.gmail_sender_email}>'
    )
    message["Subject"] = subject
    for name, value in (headers or {}).items():
        message[name] = value
    message.set_content(body)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    payload: dict = {"raw": raw}
    if thread_id:
        payload["threadId"] = thread_id
    return (
        (service or _service())
        .users()
        .messages()
        .send(userId="me", body=payload)
        .execute()
    )


def search(query: str, max_results: int = 100, *, service=None) -> list[dict]:
    """Message stubs ({id, threadId}) matching an arbitrary Gmail query."""
    result = (
        (service or _service())
        .users()
        .messages()
        .list(userId="me", q=query, maxResults=max_results)
        .execute()
    )
    return result.get("messages", [])


def list_inbox(newer_than_days: int, max_results: int, *, service=None) -> list[dict]:
    """Message stubs ({id, threadId}) for recent inbound mail."""
    return search(
        f"in:inbox -from:me newer_than:{newer_than_days}d",
        max_results,
        service=service,
    )


def get_message(message_id: str, *, service=None) -> dict:
    return (
        (service or _service())
        .users()
        .messages()
        .get(userId="me", id=message_id, format="full")
        .execute()
    )


def profile(*, service=None) -> dict:
    """{emailAddress, historyId, …} of the mailbox."""
    return (service or _service()).users().getProfile(userId="me").execute()


def inbox_history(start_history_id: str, *, service=None) -> tuple[list[dict], str]:
    """Messages added to the inbox since start_history_id, and the new cursor.

    Raises googleapiclient.errors.HttpError 404 when the cursor is older than
    Gmail keeps history (about a week): the caller falls back to a search."""
    svc = service or _service()
    stubs: list[dict] = []
    page_token: str | None = None
    history_id = start_history_id
    while True:
        response = (
            svc.users()
            .history()
            .list(
                userId="me",
                startHistoryId=start_history_id,
                historyTypes=["messageAdded"],
                labelId="INBOX",
                pageToken=page_token,
            )
            .execute()
        )
        history_id = response.get("historyId", history_id)
        for record in response.get("history", []):
            stubs.extend(added["message"] for added in record.get("messagesAdded", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            return stubs, history_id


def extract_headers(message: dict) -> dict[str, str]:
    return {
        h["name"].lower(): h["value"]
        for h in message.get("payload", {}).get("headers", [])
    }


def ensure_label(name: str) -> str:
    """Return the label ID for *name*, creating it if it doesn't exist."""
    if name in _label_cache:
        return _label_cache[name]
    svc = _service()
    for label in svc.users().labels().list(userId="me").execute().get("labels", []):
        if label["name"] == name:
            _label_cache[name] = label["id"]
            return label["id"]
    created = svc.users().labels().create(
        userId="me",
        body={
            "name": name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
        },
    ).execute()
    _label_cache[name] = created["id"]
    return created["id"]


def archive_to_label(message_id: str, label_id: str) -> None:
    """Move a message out of the inbox into the given label."""
    _service().users().messages().modify(
        userId="me",
        id=message_id,
        body={"addLabelIds": [label_id], "removeLabelIds": ["INBOX"]},
    ).execute()


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
