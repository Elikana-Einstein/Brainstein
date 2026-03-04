import io
import wave
import os
import json
import numpy as np
from flask import Flask
from flask_sock import Sock
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
sock = Sock(app)

apikey = os.getenv('grog_api_key')
url = os.getenv('uri_mongodb')
# Initialize Groq (Get your key at console.groq.com)
client = Groq(api_key=apikey)

THRESHOLD = 500  
SILENCE_CHUNKS_LIMIT = 25 # Wait about 200ms of silence before transcribing
audio_buffer = []
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
        transcription = client.audio.transcriptions.create(
            file=("speech.wav", byte_io),
            model="whisper-large-v3-turbo"
        )
        user_text = transcription.text
        
        if not user_text.strip():
            return None, None
            
        print(f"\n👤 User: {user_text}")

        # 3. Chat (UPDATED MODEL: llama-3.1-8b-instant)
        chat_completion = client.chat.completions.create(
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
    
@sock.route('/audio')
def handle_audio(ws):
    global audio_buffer
    silence_counter = 0
    print("🚀 Listener Active")
    
    while True:
        data = ws.receive()
        if not data:
            break
            
        audio_chunk = np.frombuffer(data, dtype=np.int16)
        rms = np.sqrt(np.mean(audio_chunk.astype(float)**2))

        if rms > THRESHOLD:
            # User is speaking, save the data
            audio_buffer.append(data)
            silence_counter = 0
            print("🗣️", end="", flush=True) 
        else:
            # Silence detected
            if len(audio_buffer) > 0:
                silence_counter += 1
                
                # If silence exceeds limit, the user is finished talking
                if silence_counter > SILENCE_CHUNKS_LIMIT:
                    print("\n⌛ Thinking...")
                    user_text, ai_text = get_ai_response(audio_buffer)
                    
                    if user_text and ai_text:
                        # Send JSON back to React
                        ws.send(json.dumps({
                            "user": user_text,
                            "ai": ai_text
                        }))
                    
                    # Reset for next sentence
                    audio_buffer = []
                    silence_counter = 0
            else:
                # Idle silence (no audio buffered yet)
                pass

if __name__ == '__main__':
    app.run(port=5000, debug=False)