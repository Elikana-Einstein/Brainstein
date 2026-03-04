// Audio.js
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.moduleLoaded = false;
        this.source = null;
        this.pcmNode = null;
        this.isActive = false;
    }
// Inside your AudioManager class in Audio.1234js
async turnMicOn(socket) { // Accept the socket here
    try {
        this.websocket = socket; // Store reference

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        console.log(123)
        if (!this.moduleLoaded) {
            await this.audioContext.audioWorklet.addModule('/audioProcessor.js');
        console.log(1234563)

            this.moduleLoaded = true;
        }
        console.log(16783)


        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, sampleRate: 16000 }
        });

        this.source = this.audioContext.createMediaStreamSource(stream);
        this.pcmNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

        // STREAMING LOGIC: Send PCM data to WebSocket
        this.pcmNode.port.onmessage = (event) => {
    // This logs every ~20ms
    console.log('Worklet is alive, socket state:', this.websocket ? this.websocket.readyState : 'NO SOCKET');

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(event.data.pcmBuffer);
    }
};

        this.source.connect(this.pcmNode);
        this.isActive = true;
        console.log("AudioContext State:", this.audioContext.state);
        console.log("🎙️ Streaming started...");
        
    } catch (error) {
        console.error('❌ Mic start failed:', error);
    }
}

    turnMicOff() {
        if (this.source) {
            this.source.mediaStream.getTracks().forEach(track => track.stop());
            this.source.disconnect();
            this.source = null;
        }

        if (this.pcmNode) {
            this.pcmNode.port.onmessage = null;
            this.pcmNode.disconnect();
            this.pcmNode = null;
        }

        this.isActive = false;
        console.log('🔇 Microphone fully powered down');
    }
}

export const audioManager = new AudioManager();