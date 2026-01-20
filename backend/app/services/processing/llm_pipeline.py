from datetime import datetime
from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.llm.client import analyze_batch_with_llm


BATCH_SIZE = 5


def process_unprocessed_content(db: Session):
    records = (
        db.query(Content)
        .filter(Content.is_processed == False)
        .limit(BATCH_SIZE)
        .all()
    )



    texts = [r.original_text for r in records]

    results = analyze_batch_with_llm(texts)

    if not results:
        return "Error processing batch"

    for record, result in zip(records, results):
        record.original_language = result.get("detected_language")
        record.translated_text = result.get("translated_text")
        record.aspect = result.get("aspect")
        record.category = result.get("category")
        record.confidence_score = result.get("confidence_score")
        record.sentiment = result.get("sentiment")

        record.is_processed = True
        record.processed_at = datetime.utcnow()
        db.add(record)
    db.commit()

    
    return "Processing complete"
