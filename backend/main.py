
from flask import Flask
from flask_sock import Sock
from  ai_workload.api import api_handle_audio
app = Flask(__name__) 
sock = Sock(app)



    
@sock.route('/audio')
def handle_audio(ws):
    api_handle_audio(ws)

@sock.route('/db/add')
def add_chat():
    pass
@sock.route('/db/get')
def get_chat():
    pass


@sock.route('/gemini')
def handle_live_with_gemini(ws):
    pass






if __name__ == '__main__':
    app.run(port=5000, debug=False)