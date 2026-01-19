from google import genai
from google.genai import types

# 1. Initialize the client (Replace with your actual API key)
client = genai.Client(api_key="YOUR_GEMINI_API_KEY")

def process_infrastructure_feedback(raw_text):
    # This prompt ensures sarcasm is preserved and output is structured for your database
    system_instruction = (
        "You are an expert in Indian urban infrastructure and linguistics. "
        "Translate the input text to English while preserving local sarcasm and nuances. "
        "Identify the infrastructure 'Aspect' (e.g., Road, Water, Transport) and "
        "the 'Sentiment' (Positive/Negative/Neutral). "
        "Return the result strictly in JSON format."
    )

    response = client.models.generate_content(
        model="gemini-1.5-flash",  # Best for Free Tier
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json"
        ),
        contents=raw_text
    )
    
    return response.text

# Example: Multilingual feedback with sarcasm
sample_feedback = "ಬೆಂಗಳೂರು ರಸ್ತೆಗಳು ತುಂಬಾ ಚೆನ್ನಾಗಿವೆ, ಪ್ರತಿದಿನ ಸ್ವಿಮ್ಮಿಂಗ್ ಮಾಡಬಹುದು!" 
# (Translation: Bengaluru roads are great, you can go swimming every day!)

result = process_infrastructure_feedback(sample_feedback)
print(result)