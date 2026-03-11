from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-1.5-flash-8b"

def get_gemini_response(system_prompt: str, conversation_history: list) -> str:
    try:
        contents = []

        for msg in conversation_history:
            role = msg.get("role", "user")
            parts = msg.get("parts", [])
            text = parts[0].get("text", "") if parts else ""
            if text:
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=text)]
                    )
                )

        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=system_prompt)]
            )
        )

        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1024,
            )
        )

        return response.text

    except Exception as e:
        print(f"Gemini error: {e}")
        return "I'm sorry, I encountered an error. Please try again."