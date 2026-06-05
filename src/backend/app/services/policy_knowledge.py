"""Loads the condensed policy reference document and caches it for prompt injection."""
from functools import lru_cache
from pathlib import Path

_POLICY_FILE = Path(__file__).parent / "prompts" / "policy_reference.md"


@lru_cache(maxsize=1)
def get_policy_context() -> str:
    """Return the full policy reference text (cached after first read)."""
    return _POLICY_FILE.read_text(encoding="utf-8")
