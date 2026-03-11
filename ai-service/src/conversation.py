from src.gemini import get_gemini_response
import json

def build_system_prompt(chat_state: dict, user_message: str) -> str:
    """
    Build the prompt for Gemini based on what info we have so far.
    chat_state contains: vehicle_brand, vehicle_model, vehicle_year
    """

    has_brand = chat_state.get("vehicle_brand")
    has_model = chat_state.get("vehicle_model")
    has_year = chat_state.get("vehicle_year")

    # Stage 1 - No vehicle info yet, ask for brand
    if not has_brand:
        return f"""
You are a vehicle diagnostic assistant. Your job is to help users diagnose vehicle issues.

The user just said: "{user_message}"

Extract the vehicle brand from their message if they mentioned one.
If they mentioned a brand, confirm it warmly and ask for the vehicle model.
If they did not mention a brand, politely ask: "What is the brand of your vehicle? (e.g., Toyota, Honda, BMW, Ford)"

Respond in a friendly, conversational tone. Keep it short.

IMPORTANT: Respond ONLY with a JSON object like this:
{{
  "reply": "your message to the user",
  "vehicle_brand": "extracted brand or null",
  "vehicle_model": null,
  "vehicle_year": null
}}
"""

    # Stage 2 - Have brand, need model
    if has_brand and not has_model:
        return f"""
You are a vehicle diagnostic assistant.
We already know the vehicle brand is: {has_brand}

The user just said: "{user_message}"

Extract the vehicle model from their message if they mentioned one.
If they mentioned a model, confirm it and ask for the manufacturing year.
If they did not mention a model, politely ask: "What is the model of your {has_brand}? (e.g., Corolla, Civic, X5)"

Respond in a friendly, conversational tone. Keep it short.

IMPORTANT: Respond ONLY with a JSON object like this:
{{
  "reply": "your message to the user",
  "vehicle_brand": "{has_brand}",
  "vehicle_model": "extracted model or null",
  "vehicle_year": null
}}
"""

    # Stage 3 - Have brand and model, need year
    if has_brand and has_model and not has_year:
        return f"""
You are a vehicle diagnostic assistant.
We already know: {has_brand} {has_model}

The user just said: "{user_message}"

Extract the manufacturing year from their message if they mentioned one.
If they mentioned a year, confirm it and ask about their vehicle issue.
If they did not mention a year, politely ask: "What year was your {has_brand} {has_model} manufactured?"

Respond in a friendly, conversational tone. Keep it short.

IMPORTANT: Respond ONLY with a JSON object like this:
{{
  "reply": "your message to the user",
  "vehicle_brand": "{has_brand}",
  "vehicle_model": "{has_model}",
  "vehicle_year": "extracted year or null"
}}
"""

    # Stage 4 - Have all vehicle info, diagnose the issue
    if has_brand and has_model and has_year:
        return f"""
You are an expert vehicle diagnostic assistant.
The user's vehicle is: {has_year} {has_brand} {has_model}

The user just said: "{user_message}"

Analyze their message:
- If they are describing a vehicle issue or problem, provide a detailed diagnosis and solution.
  Include: possible causes, recommended fixes, urgency level, and whether they need a mechanic.
- If they are asking a follow-up question about the same vehicle, answer helpfully.
- If they say the issue is resolved or say goodbye, thank them warmly.

Be thorough but easy to understand. Use simple language.

IMPORTANT: Respond ONLY with a JSON object like this:
{{
  "reply": "your detailed diagnosis and solution message",
  "vehicle_brand": "{has_brand}",
  "vehicle_model": "{has_model}",
  "vehicle_year": "{has_year}"
}}
"""

def process_message(
    chat_id: int,
    user_message: str,
    vehicle_brand: str,
    vehicle_model: str,
    vehicle_year: str,
    messages: list
) -> dict:
    """
    Main function — processes user message and returns bot reply + vehicle info
    """

    # Current state of vehicle info
    chat_state = {
        "vehicle_brand": vehicle_brand,
        "vehicle_model": vehicle_model,
        "vehicle_year": vehicle_year,
    }

    # Build conversation history for Gemini
    # Convert our DB messages to Gemini format
    gemini_history = []
    for msg in messages[:-1]:  # exclude the latest user message (we send it separately)
        if msg["role"] == "user":
            gemini_history.append({
                "role": "user",
                "parts": [{"text": msg["content"]}]
            })
        elif msg["role"] == "bot":
            gemini_history.append({
                "role": "model",
                "parts": [{"text": msg["content"]}]
            })

    # Build the system prompt based on current stage
    system_prompt = build_system_prompt(chat_state, user_message)

    # Get Gemini response
    raw_response = get_gemini_response(system_prompt, gemini_history)

    # Parse the JSON response from Gemini
    try:
        # Clean response (sometimes Gemini adds ```json blocks)
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        result = json.loads(cleaned)

        return {
            "reply": result.get("reply", "I didn't understand that. Could you please repeat?"),
            "vehicle_brand": result.get("vehicle_brand"),
            "vehicle_model": result.get("vehicle_model"),
            "vehicle_year": result.get("vehicle_year"),
        }

    except json.JSONDecodeError:
        # If Gemini didn't return valid JSON, use the raw text as reply
        return {
            "reply": raw_response,
            "vehicle_brand": vehicle_brand,
            "vehicle_model": vehicle_model,
            "vehicle_year": vehicle_year,
        }