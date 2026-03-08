import json
import base64
import asyncio
from .settings import client2, MODEL_ID
from google.genai import types


def live_conversation_with_gemini(ws):
    async def run_session():
        # this fixes the Updated config to match current google-genai API
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction="You are a drawing coach. You can see the user's canvas. Guide them verbally and collaborate on their drawing ideas."
        )

        async with client2.aio.live.connect(model=MODEL_ID, config=config) as session:

            async def send_to_gemini():
                while True:
                    try:
                        message = ws.receive()
                        if not message:
                            break
                        data = json.loads(message)

                        if "audio" in data:
                            await session.send(
                                input=base64.b64decode(data["audio"]),
                                end_of_turn=False
                            )

                        if "image" in data:
                            await session.send(
                                input=types.Part(
                                    inline_data=types.Blob(
                                        mime_type="image/jpeg",
                                        data=base64.b64decode(data["image"])
                                    )
                                )
                            )
                    except Exception as e:
                        print(f"send_to_gemini error: {e}")
                        break

            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        sc = response.server_content

                        if not sc:
                            continue

                        # AI audio response — send to React to play
                        if sc.model_turn:
                            for part in sc.model_turn.parts:
                                if part.inline_data:
                                    audio_b64 = base64.b64encode(
                                        part.inline_data.data
                                    ).decode('utf-8')
                                    ws.send(json.dumps({
                                        "type": "audio",
                                        "data": audio_b64
                                    }))
                                if part.text:
                                    ws.send(json.dumps({
                                        "type": "ai_transcript",
                                        "text": part.text
                                    }))

                        # Interrupted---- tell React to stop playing audio
                        if sc.interrupted:
                            ws.send(json.dumps({"control": "stop_audio"}))

                except Exception as e:
                    print(f"receive_from_gemini error: {e}")

            await asyncio.gather(send_to_gemini(), receive_from_gemini())

    asyncio.run(run_session())
