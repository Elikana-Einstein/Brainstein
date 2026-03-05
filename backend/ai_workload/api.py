
import json
import numpy as np
from .settings import THRESHOLD,SILENCE_CHUNKS_LIMIT,audio_buffer
from .grog import get_ai_response

def api_handle_audio(ws):
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