from langchain_openai import ChatOpenAI

from app.config import settings


def make_llm(model: str, *, streaming: bool = False) -> ChatOpenAI:
    kwargs: dict = dict(
        api_key=settings.GREENPT_KEY,
        streaming=streaming,
        base_url="https://api.greenpt.ai/v1",
        model=model,
    )
    model_lower = model.lower()
    is_reasoning = model_lower.startswith(("o1", "o3", "o4")) or "5.2" in model_lower
    if not is_reasoning:
        kwargs["temperature"] = 0.1
    return ChatOpenAI(**kwargs)
