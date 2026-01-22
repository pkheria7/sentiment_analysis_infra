from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.nlp.sentiment import predict_sentiment


def llm_vs_model_sentiment(db: Session, limit: int | None = None):
    query = (
        db.query(Content)
        .filter(
            Content.translated_text.isnot(None),
            Content.sentiment.isnot(None)
        )
    )

    if limit:
        query = query.limit(limit)

    records = query.all()

    total = 0
    matches = 0
    mismatches = 0
    mismatch_samples = []

    for record in records:
        model_result = predict_sentiment(record.translated_text)
        model_sentiment = model_result["sentiment"]

        llm_sentiment = record.sentiment

        total += 1

        if model_sentiment == llm_sentiment:
            matches += 1
        else:
            mismatches += 1
            mismatch_samples.append({
                "id": record.id,
                "llm_sentiment": llm_sentiment,
                "model_sentiment": model_sentiment,
                "text": record.translated_text[:200]
            })

    agreement_rate = round((matches / total) * 100, 2) if total > 0 else 0

    return {
        "total_samples": total,
        "matches": matches,
        "mismatches": mismatches,
        "agreement_percentage": agreement_rate,
        "sample_mismatches": mismatch_samples[:5]  # optional preview
    }
