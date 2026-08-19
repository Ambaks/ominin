"""One-time Gmail OAuth consent — prints the refresh token to paste into env.

Usage (from backend/, with GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET in .env):
    uv run python scripts/gmail_auth.py

Opens a browser: sign in as the sender account (omininsupport@gmail.com) and
accept. The OAuth app must be in "production" publishing status, otherwise
Google expires the refresh token after 7 days.
"""

import sys
from pathlib import Path

# Lancé par chemin (`uv run python scripts/gmail_auth.py`), sys.path[0] est
# scripts/ — pas la racine du projet qui contient le paquet app.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google_auth_oauthlib.flow import InstalledAppFlow

from app.clients.gmail import SCOPES, TOKEN_URI
from app.config import settings


def main() -> None:
    if not settings.gmail_client_id or not settings.gmail_client_secret:
        raise SystemExit("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.")

    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": settings.gmail_client_id,
                "client_secret": settings.gmail_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": TOKEN_URI,
            }
        },
        scopes=SCOPES,
    )
    credentials = flow.run_local_server(port=0)
    print("\nAdd this to backend/.env (and to Render env vars):\n")
    print(f"GMAIL_REFRESH_TOKEN={credentials.refresh_token}")


if __name__ == "__main__":
    main()
