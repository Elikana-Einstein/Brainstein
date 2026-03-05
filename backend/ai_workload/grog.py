
from .settings import client1
import io
import wave

def get_ai_response(audio_data):
    """Transcribes audio and gets an AI answer."""
    try:
        # 1. Prepare Buffer as a virtual WAV file
        byte_io = io.BytesIO()
        with wave.open(byte_io, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2) # 16-bit
            wf.setframerate(16000)
            wf.writeframes(b''.join(audio_data))
        byte_io.seek(0)

        # 2. Transcribe (Whisper Large V3 Turbo is faster)
        transcription = client1.audio.transcriptions.create(
            file=("speech.wav", byte_io),
            model="whisper-large-v3-turbo"
        )
        user_text = transcription.text
        
        if not user_text.strip():
            return None, None
            
        print(f"\n👤 User: {user_text}")

        # 3. Chat (UPDATED MODEL: llama-3.1-8b-instant)
        chat_completion = client1.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Keep your answers concise for voice conversation."},
                {"role": "user", "content": user_text}
            ],
            model="llama-3.1-8b-instant", 
        )
        ai_text = chat_completion.choices[0].message.content
        print(f"🤖 AI: {ai_text}")

        return user_text, ai_text
    except Exception as e:
        print(f"❌ AI Error: {e}")
        return None, None