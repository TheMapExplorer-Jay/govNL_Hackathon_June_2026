from langchain_openai import ChatOpenAI

from app.config import settings

_GREENPT_BASE = "https://api.greenpt.ai/v1"
_OPENAI_BASE = "https://api.openai.com/v1"


def _resolve_credentials() -> tuple[str, str]:
    """Return (api_key, base_url) based on available settings.

    Priority:
    1. LLM_BASE_URL + whichever key is set
    2. GreenPT key → GreenPT base URL
    3. OpenAI key  → OpenAI base URL
    """
    if settings.LLM_BASE_URL:
        key = settings.GREENPT_KEY or settings.OPENAI_API_KEY
        return key, settings.LLM_BASE_URL

    if settings.GREENPT_KEY:
        return settings.GREENPT_KEY, _GREENPT_BASE

    if settings.OPENAI_API_KEY:
        return settings.OPENAI_API_KEY, _OPENAI_BASE

    # Neither key configured — return empty; the API call will fail with a
    # clear 401 rather than a confusing KeyError.
    return "", _GREENPT_BASE


def make_llm(model: str, *, streaming: bool = False) -> ChatOpenAI:
    api_key, base_url = _resolve_credentials()
    kwargs: dict = dict(
        api_key=api_key,
        streaming=streaming,
        base_url=base_url,
        model=model,
    )
    model_lower = model.lower()
    is_reasoning = model_lower.startswith(("o1", "o3", "o4")) or "5.2" in model_lower
    if not is_reasoning:
        kwargs["temperature"] = 0.1
    return ChatOpenAI(**kwargs)
