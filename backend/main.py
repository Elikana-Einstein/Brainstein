from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_workload.gemini import live_conversation_with_gemini
import uvicorn
import asyncio

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your React app's URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.websocket("/gemini")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Safely receive first message regardless of frame type
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            return
        # Handle both text and bytes
        initial_data = message.get("text") or message.get("bytes", b"").decode("utf-8")
        await live_conversation_with_gemini(websocket, initial_data)
    except Exception as e:
        print(f"websocket_endpoint error: {e}")

if __name__ == "__main__":
    # Equivalent to app.run(port=5000)
    uvicorn.run(app, host="0.0.0.0", port=5000)