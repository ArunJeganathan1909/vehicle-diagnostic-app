from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from src.conversation import process_message
import traceback
import uvicorn

app = FastAPI(title="Vehicle Diagnostic AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "https://autodiag-backend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    chat_id:          int
    vehicle_brand:    Optional[str] = None
    vehicle_model:    Optional[str] = None
    vehicle_year:     Optional[str] = None
    messages:         List[dict]
    image_base64:     Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"

class ResourceLink(BaseModel):
    label: str
    url:   str
    type:  str   # 'youtube' | 'parts'

class MessageResponse(BaseModel):
    reply:          str
    vehicle_brand:  Optional[str] = None
    vehicle_model:  Optional[str] = None
    vehicle_year:   Optional[str] = None
    resource_links: Optional[List[ResourceLink]] = []   # ← new field

@app.get("/")
def root():
    return {"message": "Vehicle Diagnostic AI Service is running!"}

@app.post("/chat", response_model=MessageResponse)
async def chat(request: MessageRequest):
    try:
        user_messages = [m for m in request.messages if m["role"] == "user"]
        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message found")

        latest_user_message = user_messages[-1]["content"]

        result = process_message(
            chat_id=request.chat_id,
            user_message=latest_user_message,
            vehicle_brand=request.vehicle_brand,
            vehicle_model=request.vehicle_model,
            vehicle_year=request.vehicle_year,
            messages=request.messages,
            image_base64=request.image_base64,
            image_media_type=request.image_media_type or "image/jpeg",
        )

        # Always cast vehicle_year to string
        if result.get("vehicle_year") is not None:
            result["vehicle_year"] = str(result["vehicle_year"])

        # Ensure resource_links always present
        if "resource_links" not in result:
            result["resource_links"] = []

        return result

    except HTTPException:
        raise
    except Exception as e:
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("❌ CHAT ENDPOINT ERROR")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        traceback.print_exc()
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)