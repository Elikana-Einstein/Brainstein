
import { GoogleGenAI, Modality, MediaResolution } from '@google/genai';
import { config } from '../config/env.js';
import { CANVAS_SYSTEM_PROMPT, CANVAS_TOOLS } from './mcp.js';

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

export const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';


export const SESSION_CONFIG = {
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,

  inputAudioTranscription: {},
  outputAudioTranscription: {},

  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Aoede',
      },
    },
  },

  systemInstruction: {
    parts: [
      { text: 'You are a helpful assistant.',tools:CANVAS_SYSTEM_PROMPT },
    ],
  },

  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
      endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
      prefixPaddingMs: 20,
      silenceDurationMs: 500,
    },
  },
    tools: CANVAS_TOOLS,
  contextWindowCompression: {
    triggerTokens: '104857',
    slidingWindow: {
      targetTokens: '52428',
    },
  },
};

export function connectGemini(callbacks) {
  return ai.live.connect({
    model: MODEL,
    config: SESSION_CONFIG,
    callbacks,
  });
}
