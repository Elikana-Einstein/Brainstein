from flask import Flask, request, jsonify
from flask_sock import Sock
from flask_cors import CORS
from ai_workload.api import api_handle_audio
from ai_workload.gemini import live_conversation_with_gemini
#from ai_workload.grog import get_text_ai_response, get_ai_response_from_file
import json
import io

app = Flask(__name__)
CORS(app)
sock = Sock(app)


@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_text = data.get('message', '').strip()
        if not user_text:
            return jsonify({"error": "Empty message"}), 400

        ai_text = live_conversation_with_gemini(user_text)

        try:
            from ai_workload.database.collections import chat_collection
            chat_collection.insert_one({"user": user_text, "ai": ai_text})
        except Exception as db_err:
            print(f"⚠️ MongoDB save skipped: {db_err}")

        return jsonify({"user": user_text, "ai": ai_text})

    except Exception as e:
        print(f"❌ Chat error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/voice', methods=['POST'])
def voice():
    """Receive a voice note (webm), transcribe it, return AI response."""
    try:
        audio_file = request.files.get('audio')
        if not audio_file:
            return jsonify({"error": "No audio file"}), 400

        audio_bytes = audio_file.read()
        user_text, ai_text = live_conversation_with_gemini(audio_bytes)

        if not user_text:
            return jsonify({"error": "Could not transcribe audio"}), 400

        try:
            from ai_workload.database.collections import chat_collection
            chat_collection.insert_one({"user": user_text, "ai": ai_text})
        except Exception as db_err:
            print(f"⚠️ MongoDB save skipped: {db_err}")

        return jsonify({"user": user_text, "ai": ai_text})

    except Exception as e:
        print(f"❌ Voice error: {e}")
        return jsonify({"error": str(e)}), 500


@sock.route('/audio')
def handle_audio(ws):
    api_handle_audio(ws)


@sock.route('/db/get')
def get_chat(ws):
    try:
        from ai_workload.database.collections import chat_collection
        chats = list(chat_collection.find({}, {"_id": 0}).sort("_id", -1).limit(50))
        ws.send(json.dumps({"chats": chats}))
    except Exception as e:
        ws.send(json.dumps({"status": "error", "message": str(e)}))


@sock.route('/gemini')
def handle_live_with_gemini(ws):
    live_conversation_with_gemini(ws)


if __name__ == '__main__':
    app.run(port=5000, debug=False)