class PCMProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputData = input[0];

        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            let sample = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }

        // ✅ Transfer the ArrayBuffer, not the Int16Array
        this.port.postMessage({ pcmBuffer: pcmData.buffer }, [pcmData.buffer]);

        return true;
    }
}

registerProcessor("pcm-processor", PCMProcessor);