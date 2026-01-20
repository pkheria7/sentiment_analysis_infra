from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.content import Content

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total = db.query(Content).count()

    sentiment_counts = dict(
        db.query(Content.sentiment, func.count(Content.id))
        .filter(Content.is_processed == True)
        .group_by(Content.sentiment)
        .all()
    )

    top_aspect = (
        db.query(Content.aspect, func.count(Content.id).label("c"))
        .filter(Content.is_processed == True)
        .group_by(Content.aspect)
        .order_by(func.count(Content.id).desc())
        .first()
    )

    top_source = (
        db.query(Content.source, func.count(Content.id).label("c"))
        .group_by(Content.source)
        .order_by(func.count(Content.id).desc())
        .first()
    )

    return {
        "total_feedback": total,
        "sentiment_distribution": sentiment_counts,
        "top_aspect": top_aspect[0] if top_aspect else None,
        "top_source": top_source[0] if top_source else None,
    }

@router.get("/sentiment")
def sentiment_distribution(db: Session = Depends(get_db)):
    data = (
        db.query(Content.sentiment, func.count(Content.id))
        .filter(Content.is_processed == True)
        .group_by(Content.sentiment)
        .all()
    )

    return [{"sentiment": k, "count": v} for k, v in data]


@router.get("/aspects")
def aspect_distribution(db: Session = Depends(get_db)):
    data = (
        db.query(Content.aspect, func.count(Content.id))
        .filter(Content.is_processed == True)
        .group_by(Content.aspect)
        .all()
    )

    return [{"aspect": k, "count": v} for k, v in data]


@router.get("/sources")
def source_distribution(db: Session = Depends(get_db)):
    data = (
        db.query(Content.source, func.count(Content.id))
        .group_by(Content.source)
        .all()
    )

    return [{"source": k, "count": v} for k, v in data]


@router.get("/languages")
def language_distribution(db: Session = Depends(get_db)):
    data = (
        db.query(Content.original_language, func.count(Content.id))
        .filter(Content.is_processed == True)
        .group_by(Content.original_language)
        .all()
    )

    return [{"language": k, "count": v} for k, v in data]

@router.get("/trends")
def volume_trend(db: Session = Depends(get_db)):
    data = (
        db.query(
            func.date(Content.created_at),
            func.count(Content.id)
        )
        .group_by(func.date(Content.created_at))
        .order_by(func.date(Content.created_at))
        .all()
    )

    return [{"date": str(d), "count": c} for d, c in data]


@router.get("/content")
def content_table(
    sentiment: str | None = None,
    aspect: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Content).filter(Content.is_processed == True)

    if sentiment:
        query = query.filter(Content.sentiment == sentiment)
    if aspect:
        query = query.filter(Content.aspect == aspect)
    if source:
        query = query.filter(Content.source == source)

    rows = query.order_by(Content.created_at.desc()).limit(limit).offset(offset).all()

    return [
        {
            "id": r.id,
            "source": r.source,
            "original_text": r.original_text,
            "translated_text": r.translated_text,
            "sentiment": r.sentiment,
            "aspect": r.aspect,
            "language": r.original_language,
            "timestamp": r.timestamp,
            "location": r.location_name,
        }
        for r in rows
    ]


@router.get("/positive-locations")
def positive_feedback_by_location(db: Session = Depends(get_db)):
    data = (
        db.query(Content.location_name, func.count(Content.id))
        .filter(Content.is_processed == True, Content.sentiment == "Positive")
        .filter(Content.location_name != None)
        .group_by(Content.location_name)
        .order_by(func.count(Content.id).desc())
        .all()
    )

    return [{"aspect": k, "count": v} for k, v in data]


@router.get("/negative-locations")
def negative_feedback_by_location(db: Session = Depends(get_db)):
    data = (
        db.query(Content.location_name, func.count(Content.id))
        .filter(Content.is_processed == True, Content.sentiment == "Negative")
        .filter(Content.location_name != None)
        .group_by(Content.location_name)
        .order_by(func.count(Content.id).desc())
        .all()
    )

    return [{"aspect": k, "count": v} for k, v in data]


