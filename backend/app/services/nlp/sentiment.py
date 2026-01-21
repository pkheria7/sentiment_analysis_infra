import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from scipy.special import softmax

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

LABELS = ["Negative", "Neutral", "Positive"]


def predict_sentiment(text: str):
    if not text or not text.strip():
        return {
            "sentiment": "Neutral",
            "confidence": 0.0
        }

    encoded = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    with torch.no_grad():
        outputs = model(**encoded)

    scores = outputs.logits[0].cpu().numpy()
    probs = softmax(scores)

    idx = probs.argmax()

    return {
        "sentiment": LABELS[idx],
        "confidence": float(probs[idx])
    }
