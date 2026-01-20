from datetime import datetime
from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.llm.client import analyze_text_with_llm


def process_unprocessed_content(db: Session, limit: int = 20):
    records = (
        db.query(Content)
        .filter(Content.is_processed == False)
        .limit(limit)
        .all()
    )

    for record in records:
        result = analyze_text_with_llm(record.original_text)

        if not result:
            continue

        record.original_language = result.get("detected_language")
        record.translated_text = result.get("translated_text")
        record.aspect = result.get("aspect")
        record.sentiment = result.get("sentiment")

        record.is_processed = True
        record.processed_at = datetime.utcnow()

        db.add(record)

    db.commit()
