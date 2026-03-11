class AudioManager {
  constructor() {
    this.websocket      = null;
    this.stream         = null;
    this.isActive       = false;
    this.audioContext   = null;
    this.processor      = null;
  }

  async turnMicOn(socket) {
    try {
      this.websocket = socket;

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Gemini requires 16kHz PCM
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      const source = this.audioContext.createMediaStreamSource(this.stream);

      // ScriptProcessorNode gives us raw float32 PCM samples
      // 4096 samples @ 16kHz ≈ 256ms per chunk
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);

        // Convert float32 → 16-bit PCM
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const clamped = Math.max(-1, Math.min(1, float32[i]));
          pcm16[i] = clamped * 32767;
        }

        // Convert to base64
        const bytes  = new Uint8Array(pcm16.buffer);
        let binary   = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        this.websocket.send(JSON.stringify({
          type:        'analyse',
          audioBase64: base64,
        }));
      };

      // Connect: mic → processor → destination (silent output)
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isActive = true;
      console.log('🎙️ Mic on — streaming 16kHz PCM');

    } catch (err) {
      console.error('❌ Mic start failed:', err);
    }
  }

  turnMicOff() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.isActive  = false;
    this.websocket = null;
    console.log('🔇 Mic off');
  }
}

export const audioManager = new AudioManager();