import json
import base64
from .settings import client2, MODEL_ID
from google.genai import types
import asyncio
import io
import wave
from .settings import client1


def live_conversation_with_gemini(ws):
    async def run_session():
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
                            await session.send(input=base64.b64decode(data["audio"]), end_of_turn=False)
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
                        print(f" send_to_gemini error: {e}")
                        break

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
                                    ws.send(json.dumps({"type": "audio", "data": audio_b64}))
                                if part.text:
                                    ws.send(json.dumps({"type": "ai_transcript", "text": part.text}))
                        if sc.interrupted:
                            ws.send(json.dumps({"control": "stop_audio"}))
                except Exception as e:
                    print(f" receive_from_gemini error: {e}")

            await asyncio.gather(send_to_gemini(), receive_from_gemini())

    asyncio.run(run_session())


def get_ai_response(audio_data):
    try:
        byte_io = io.BytesIO()
        with wave.open(byte_io, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(b''.join(audio_data))
        byte_io.seek(0)

        transcription = client1.audio.transcriptions.create(
            file=("speech.wav", byte_io),
            model="whisper-large-v3-turbo"
        )
        user_text = transcription.text
        if not user_text.strip():
            return None, None
        print(f"\n User: {user_text}")
        ai_text = get_text_ai_response(user_text)
        return user_text, ai_text
    except Exception as e:
        print(f" AI Error: {e}")
        return None, None


def get_text_ai_response(user_text):
    """Fast text response using llama-3.1-8b-instant on Groq."""
    try:
        chat_completion = client1.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    #  Shorter system prompt this amke sthe chat faster
                    "content": "You are a helpful assistant. Be concise."
                },
                {"role": "user", "content": user_text}
            ],
            model="llama-3.3-70b-versatile",  #  faster and  smarter model on Groq
            max_tokens=300,                    #  cap tokens so it doesn't ramble
            temperature=0.7,
        )
        ai_text = chat_completion.choices[0].message.content
        print(f" AI: {ai_text}")
        return ai_text
    except Exception as e:
        print(f"AI Error: {e}")
        return "Sorry, I couldn't process that."


def get_ai_response_from_file(audio_bytes):
    """Transcribe raw audio bytes (webm from browser) and get AI response."""
    try:
        # Groq accepts webm directly {just wrap in a file-like object}
        audio_io = io.BytesIO(audio_bytes)
        audio_io.name = 'voice.webm'

        transcription = client1.audio.transcriptions.create(
            file=("voice.webm", audio_io),
            model="whisper-large-v3-turbo"
        )
        user_text = transcription.text.strip()
        if not user_text:
            return None, None

        print(f"\n Voice: {user_text}")
        ai_text = get_text_ai_response(user_text)
        return user_text, ai_text

    except Exception as e:
        print(f"Voice transcription error: {e}")
        return None, None
