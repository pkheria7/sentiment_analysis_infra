import json
from google import genai
from google.genai import types
from app.services.llm.prompts import SYSTEM_PROMPT, build_user_prompt

# Initialize the Gemini Client
# The API key is obtained from Google AI Studio
client = genai.Client(api_key="AIzaSyA4yFgXh7p7pXe3D86igUAAcy6xUN4VFyE")

def analyze_text_with_llm(text: str) -> dict | None:
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
                # This ensures the output is valid JSON
                response_mime_type="application/json" 
            ),
            contents=build_user_prompt(text)
        )

        # Gemini's response.text will be a raw JSON string
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return None