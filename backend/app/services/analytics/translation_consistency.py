from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.nlp.translation import translate_text
from app.services.nlp.similarity import cosine_similarity


LANGUAGE_MAP = {
    "Marathi": "mr",
    "Bengali": "bn",
    "Kannada": "kn",
}


def translation_consistency_check(db: Session):
    results = {}

    for lang, lang_code in LANGUAGE_MAP.items():
        records = (
            db.query(Content)
            .filter(
                Content.original_language == lang,
                Content.translated_text.isnot(None),
                Content.original_text.isnot(None)
            )
            .limit(2)
            .all()
        )

        similarities = []

        for r in records:
            back_translated = translate_text(
                r.translated_text,
                target_language=lang_code
            )

            score = cosine_similarity(
                r.original_text,
                back_translated
            )

            similarities.append({
                "content_id": r.id,
                "similarity": round(score, 4)
            })

        avg_score = (
            sum(s["similarity"] for s in similarities) / len(similarities)
            if similarities else 0.0
        )

        results[lang] = {
            "count": len(similarities),
            "average_similarity": round(avg_score, 4),
            "samples": similarities
        }

    return results
