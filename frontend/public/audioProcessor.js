class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.targetSampleRate = 16000; // Most AI APIs want 16kHz
        this.resampleBuffer = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;
        
        const inputData = input[0]; // Mono is perfect for voice!
        
        // Convert Float32 to Int16
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            // Clamp and convert to int16 range
            let sample = inputData[i];
            sample = Math.max(-1, Math.min(1, sample));
            pcmData[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }
        
        // Send to main thread for API transmission
        this.port.postMessage({ pcmBuffer: pcmData });
        
        return true;
    }

    // Optional: Simple Voice Activity Detection
    detectVoiceActivity(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++)  {
            sum += Math.abs(audioData[i]);
        }
        const average = sum / audioData.length;
        return average > 0.01; // Threshold for voice detection
    }
}

registerProcessor("pcm-processor", PCMProcessor);