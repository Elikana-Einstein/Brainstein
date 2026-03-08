import json
import base64
import asyncio
from .settings import client2, MODEL_ID
from google.genai import types

async def live_conversation_with_gemini(ws, first_message):
    """
    ws: The FastAPI WebSocket object
    first_message: The data that triggered this call
    """
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        output_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction="You are a drawing coach. You can see the user's canvas. Guide them verbally."
    )

    async with client2.aio.live.connect(model=MODEL_ID, config=config) as session:

        async def send_to_gemini():
            message_data = first_message
            try:
                while True:
                    data = json.loads(message_data)

                    if "audio" in data:
                        # Use send_realtime_input for raw audio bytes
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=base64.b64decode(data["audio"]),
                                mime_type="audio/pcm;rate=16000"
                            )
                        )

                    if "image" in data:
                        print("Sending canvas frame to Gemini...")
                        # Use send_client_content with dict-based turns for images
                        await session.send_client_content(
                            turns={
                                "role": "user",
                                "parts": [
                                    {
                                        "inline_data": {
                                            "mime_type": "image/jpeg",
                                            "data": data["image"]  # already base64 string
                                        }
                                    }
                                ]
                            },
                            turn_complete=True
                        )

                    if "text" in data:
                        await session.send_client_content(
                            turns={
                                "role": "user",
                                "parts": [{"text": data["text"]}]
                            },
                            turn_complete=True
                        )

                    # Wait for the next message from the client
                    message_data = await ws.receive_text()

            except Exception as e:
                print(f"send_to_gemini error: {e}")

        async def receive_from_gemini():
            try:
                async for response in session.receive():
                    sc = response.server_content
                    if not sc:
                        continue

                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if part.inline_data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                                await ws.send_json({"audio": audio_b64})
                            if part.text:
                                await ws.send_json({"text": part.text})
                                print(f"Gemini text: {part.text}")

                    if sc.output_transcription:
                        transcript = sc.output_transcription.text
                        if transcript:
                            await ws.send_json({"transcript": transcript})

                    if sc.interrupted:
                        await ws.send_json({"control": "stop_audio"})

            except Exception as e:
                print(f"receive_from_gemini error: {e}")

        # Run both tasks concurrently
        await asyncio.gather(send_to_gemini(), receive_from_gemini())