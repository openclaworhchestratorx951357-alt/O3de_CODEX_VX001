from datetime import datetime
from typing import Any


def isoformat_or_none(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def read_string_value(
    payload: dict[str, object] | dict[str, Any] | None,
    key: str,
) -> str | None:
    if not isinstance(payload, dict):
        return None
    value = payload.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None


def read_nested_string_value(
    payload: dict[str, Any] | None,
    parent_key: str,
    key: str,
) -> str | None:
    if not isinstance(payload, dict):
        return None
    parent = payload.get(parent_key)
    if not isinstance(parent, dict):
        return None
    value = parent.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None
