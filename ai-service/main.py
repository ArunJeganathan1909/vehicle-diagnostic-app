from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from src.conversation import process_message
import uvicorn

app = FastAPI(title="Vehicle Diagnostic AI Service")

# Allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class MessageRequest(BaseModel):
    chat_id: int
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[str] = None
    messages: List[dict]  # full conversation history

# Response model
class MessageResponse(BaseModel):
    reply: str
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[str] = None

# Health check
@app.get("/")
def root():
    return {"message": "Vehicle Diagnostic AI Service is running!"}

# Main chat endpoint — called by Node.js backend
@app.post("/chat", response_model=MessageResponse)
async def chat(request: MessageRequest):
    try:
        # Get the latest user message (last message in history)
        user_messages = [m for m in request.messages if m["role"] == "user"]

        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message found")

        latest_user_message = user_messages[-1]["content"]

        # Process through conversation logic
        result = process_message(
            chat_id=request.chat_id,
            user_message=latest_user_message,
            vehicle_brand=request.vehicle_brand,
            vehicle_model=request.vehicle_model,
            vehicle_year=request.vehicle_year,
            messages=request.messages,
        )

        return result

    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)