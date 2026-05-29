from langchain_openai import ChatOpenAI

from app.config import settings


def make_llm(model: str, *, streaming: bool = False) -> ChatOpenAI:
    kwargs: dict = dict(
        model="gpt-5-chat-latest",
        api_key=settings.OPENAI_KEY,
        streaming=streaming,
    )
    model_lower = model.lower()
    is_reasoning = model_lower.startswith(("o1", "o3", "o4")) or "5.2" in model_lower
    if not is_reasoning:
        kwargs["temperature"] = 0.1
    return ChatOpenAI(**kwargs)
