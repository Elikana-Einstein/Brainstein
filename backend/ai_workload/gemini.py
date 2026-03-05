import json
import base64
from .settings import client2,MODEL_ID
from google.genai import types
import asyncio
def live_conversation_with_gemini(ws):
    """
    This the persistent bridge. React connects here.
    """
    async def run_session():
        # 1. Setup the Live Session
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"], # AI responds with voice
            input_audio_transcription=types.LiveConfigTranscription(enabled=True),
            output_audio_transcription=types.LiveConfigTranscription(enabled=True),
            system_instruction="You are a drawing coach. Guide the user verbally."
        )
        async with client2.aio.live.connect(model=MODEL_ID, config=config) as session:
            # TASK 1: Listen to React and Forward to Gemini
            async def send_to_gemini():
                while True:
                    message = ws.receive() # Data from React
                    data = json.loads(message)
                    
                    if "audio" in data:
                        # Forward audio chunk (must be 16kHz PCM)
                        await session.send(input=base64.b64decode(data["audio"]), end_of_turn=False)
                    
                    if "image" in data:
                        # Forward canvas frame from Fabric.js
                        await session.send(
                            input=types.Part(
                                inline_data=types.Blob(
                                    mime_type="image/jpeg",
                                    data=base64.b64decode(data["image"])
                                )
                            )
                        )
            # TASK 2: Listen to Gemini and Forward to React
            async def receive_from_gemini():
                async for response in session.receive():
                    # 1. Handle Transcripts (User or AI)
                    if response.server_content.input_transcription:
                        text = response.server_content.input_transcription.text
                        ws.send(json.dumps({"type": "user_transcript", "text": text}))

                    # 2. Handle AI Audio & AI Text
                    if response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.inline_data:
                                # Send Audio
                                audio_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                                ws.send(json.dumps({"type": "audio", "data": audio_b64}))

                            # Note: If output_audio_transcription is enabled, 
                            # text parts will also appear here as the AI "thinks" of them.
                            if part.text:
                                ws.send(json.dumps({"type": "ai_transcript", "text": part.text}))

                    if response.server_content.interrupted:
                                    ws.send(json.dumps({"control": "stop_audio"}))

            # Run both tasks concurrently
            await asyncio.gather(send_to_gemini(), receive_from_gemini())

    asyncio.run(run_session())
