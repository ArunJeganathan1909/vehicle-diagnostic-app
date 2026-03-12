from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"  # free, fast, very capable

def get_gemini_response(system_prompt: str, conversation_history: list) -> str:
    """
    Drop-in replacement for Gemini — uses Groq (free, no quota issues).
    Keeps the same function name so conversation.py needs no changes.
    """
    try:
        messages = []

        # Add conversation history
        for msg in conversation_history:
            role = msg.get("role", "user")
            parts = msg.get("parts", [])
            text = parts[0].get("text", "") if parts else ""
            if not text:
                continue
            # Groq uses "assistant" instead of "model"
            groq_role = "assistant" if role == "model" else "user"
            messages.append({"role": groq_role, "content": text})

        # Add the current system prompt as the final user message
        messages.append({"role": "user", "content": system_prompt})

        print(f"📤 Sending {len(messages)} turn(s) to Groq ({MODEL})...")

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )

        reply = response.choices[0].message.content
        print(f"✅ Groq responded: {reply[:80]}...")
        return reply

    except Exception as e:
        print(f"❌ Groq error: {type(e).__name__}: {e}")
        raise