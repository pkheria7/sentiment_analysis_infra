from datetime import datetime
from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.llm.client import analyze_batch_with_llm, summarise_negative_comments 


BATCH_SIZE = 5


def summary_content(db: Session, source: str | None = None):
    records = (
        db.query(Content)
        .filter(Content.source_ref == source)
        .filter(Content.sentiment == "Negative")
        .all()
    )
    texts = [r.original_text for r in records]

    results = summarise_negative_comments(texts)

    if not results:
        return "Error processing batch"

    return results
