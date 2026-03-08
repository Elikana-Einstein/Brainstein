import os 
from dotenv import load_dotenv
from groq import Groq
from google import genai
load_dotenv()


THRESHOLD = 500  
SILENCE_CHUNKS_LIMIT = 25 # Wait about 200ms of silence before transcribing
audio_buffer = []

grog_apikey = os.getenv('grog_api_key')
url = os.getenv('uri_mongodb')
gemini_apikey= os.getenv('gemini_api_key')
MODEL_ID = "models/gemini-2.5-flash-native-audio-latest"

# Initialize Groq (Get your key at console.groq.com)
client1 = Groq(api_key=grog_apikey)
client2 = genai.Client(api_key=gemini_apikey, http_options={'api_version': 'v1alpha'})
