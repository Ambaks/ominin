FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

ARG VERSION=dev
ENV VERSION=$VERSION UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY omilink ./omilink

CMD ["/app/.venv/bin/python", "-m", "omilink"]
