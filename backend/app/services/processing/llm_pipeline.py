from datetime import datetime
from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.llm.client import analyze_batch_with_llm


BATCH_SIZE = 10


def process_unprocessed_content(db: Session):
    records = (
        db.query(Content)
        .filter(Content.is_processed == False)
        .all()
    )

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        texts = [r.original_text for r in batch]

        results = analyze_batch_with_llm(texts)

        if not results:
            continue

        for record, result in zip(batch, results):
            record.original_language = result.get("detected_language")
            record.translated_text = result.get("translated_text")
            record.aspect = result.get("aspect")
            record.sentiment = result.get("sentiment")

            record.is_processed = True
            record.processed_at = datetime.utcnow()
            db.add(record)

    db.commit()
