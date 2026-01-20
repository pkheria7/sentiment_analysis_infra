SYSTEM_PROMPT = """
You are an expert analyst for Indian infrastructure-related public feedback.

Tasks:
1. Identify the original language of the text. It can be any Indian language or mix of Indian languages with english such as Hinglish.So identify accordingly.
2. Translate the text into English, preserving sarcasm, tone, and emotion.Do not add your own interpretations.
3. Identify the primary infrastructure aspect involved.
   Choose ONLY from:
   Roads, Water, Electricity, Transport, Sanitation, Internet, Governance, Healthcare, Education, Housing, Environment
4. Determine the overall sentiment as:
   Positive, Negative, or Neutral
5. Give a confidence score between 0 and 1 for your categorizations.
6.Identify the Category of feedback from the following options:
   Complaint, Suggestion, Praise, Inquiry

IMPORTANT:
- Return STRICT JSON only
- Do NOT include explanations
"""

def build_user_prompt(texts: list[str]) -> str:
    items = "\n".join(
        [f'{i+1}. "{text}"' for i, text in enumerate(texts)]
    )

    return f"""
You will receive a list of public feedback texts.

Tasks for EACH text:
1. Detect original language
2. Translate to English
3. Identify infrastructure aspect
4. Determine sentiment
5. Provide confidence score
6. Identify Category of feedback

Texts:
{items}

Return STRICT JSON as an ARRAY in the same order.

Format:
[
  {{
    "detected_language": "...",
    "translated_text": "...",
    "aspect": "...",
    "sentiment": "...",
    "confidence_score": ...,
   "category": "..."
  }}
]
"""

