import express from 'express'
import dotenv from 'dotenv'
import { WebSocketServer } from 'ws'
import http from 'http'
import { GoogleGenAI, Modality, MediaResolution } from '@google/genai'
import cors from 'cors'
import { addCanvas, addSlide, deleteSlide, getCanvas, getSlides, login, signup, updateSlide } from './database/routes.js'
import { connectDB } from './database/db_connection.js'
dotenv.config()

const app    = express()
app.use(cors({
  origin: '*' // This allows any website to hit your backend
}));

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
const server = http.createServer(app)
const wss    = new WebSocketServer({ server })
const ai     = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'

const SESSION_CONFIG = {
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
   outputAudioTranscription: {},           // ← get Gemini's text transcript
  inputAudioTranscription: {},
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Aoede', // Aoede, Puck, Charon, Kore, Fenrir, Leda, Orus, Zephyr
      },
    },
  },
   systemInstruction: {
      parts: [{ text: 'You are a helpful assistant.' }]
    },
  // VAD — Gemini automatically detects end-of-speech and responds
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',  // detect speech quickly
      endOfSpeechSensitivity:   'END_SENSITIVITY_HIGH',    // respond soon after silence
      prefixPaddingMs:          20,                        // ms of audio before speech included
      silenceDurationMs:        500,                       // ms of silence = end of turn
    },
  },
  contextWindowCompression: {
    triggerTokens: '104857',
    slidingWindow: { targetTokens: '52428' },
  },
}

wss.on('connection', (ws) => {
  console.log('Client connected')

  const responseQueue = []
  let geminiSession   = null
  let lastMimeType    = 'audio/pcm;rate=24000'

  async function openSession() {
    geminiSession = await ai.live.connect({
      model: MODEL,
      callbacks: {
        onopen:    () => console.log('Gemini session opened'),
        onmessage: (msg) => responseQueue.push(msg),
        onerror:   (e) => {
          console.error('Gemini error:', e.message)
          ws.send(JSON.stringify({ type: 'error', message: e.message }))
        },
        onclose: (e) => console.log('Gemini session closed:', e.reason),
      },
      config: SESSION_CONFIG,
    })
  }

  async function handleTurn() {
    let textOutput = ''

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        while (responseQueue.length > 0) {
          const msg = responseQueue.shift()
            
            
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {

              // ── Stream raw PCM chunks to client ─────────────────
              if (part.inlineData) {
                lastMimeType = part.inlineData.mimeType || lastMimeType
                ws.send(JSON.stringify({
                  type:     'audio_chunk',
                  pcm:      part.inlineData.data,
                  mimeType: lastMimeType,
                }))
              }

             

              // ── Stream text, skip thinking blurbs ────────────────
              if (part.text) {
                const isThinking = part.text.trim().startsWith('**')
                if (!isThinking) {
                  textOutput += part.text
                  ws.send(JSON.stringify({ type: 'text_chunk', text: part.text }))
                  
                }
              }
            }
          }
           if (msg.serverContent?.outputTranscription) {
                  ws.send(JSON.stringify({ 
                    type: 'transcript', 
                    text: msg.serverContent.outputTranscription.text 
                  }))
                  
                }
                if (msg.serverContent?.inputTranscription) {
                  ws.send(JSON.stringify({ 
                    type: 'user_transcript', 
                    text: msg.serverContent.inputTranscription.text 
                  }))
                }

          if (msg.serverContent?.turnComplete) {
            clearInterval(interval)
            ws.send(JSON.stringify({ type: 'turn_complete', text: textOutput }))
            resolve()
          }
        }
      }, 50)
    })
  }

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString())
      if (!geminiSession) await openSession()

      // ── Text message ─────────────────────────────────────────────
      if (data.type === 'text') {
        geminiSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: data.text }] }],
          turnComplete: true,
        })
        await handleTurn()
      }

      // ── Audio message (mic chunks from AudioManager) ─────────────
      else if (data.type === 'analyse' && data.audioBase64) {
        geminiSession.sendRealtimeInput({
          audio: {
            data:     data.audioBase64,
            mimeType: 'audio/pcm;rate=16000',
          },
        })
        // No handleTurn() here — Gemini decides when to respond

      // ── Canvas snapshot — sent every 3s from the whiteboard ──────
      } else if (data.image) {
        geminiSession.sendRealtimeInput({
          video: {
            data:     data.image,
            mimeType: 'image/jpeg',
          },
        })
        // and will push messages into responseQueue automatically
      }

    } catch (err) {
      console.error('Handler error:', err)
      ws.send(JSON.stringify({ type: 'error', message: 'Something went sideways.' }))
    }
  })

  // Continuously drain responseQueue for audio responses
  // (needed since audio chunks arrive outside of handleTurn for realtime audio)
 const drainInterval = setInterval(() => {
  while (responseQueue.length > 0) {
    const msg = responseQueue.shift()

    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          lastMimeType = part.inlineData.mimeType || lastMimeType
          ws.send(JSON.stringify({
            type:     'audio_chunk',
            pcm:      part.inlineData.data,
            mimeType: lastMimeType,
          }))
        }
        if (part.text) {
          const isThinking = part.text.trim().startsWith('**')
          if (!isThinking) {
            ws.send(JSON.stringify({ type: 'text_chunk', text: part.text }))
          }
        }
      }
    }

    // ── ADD THESE THREE BLOCKS ──────────────────────────────────
    if (msg.serverContent?.outputTranscription) {
      ws.send(JSON.stringify({
        type: 'transcript',
        text: msg.serverContent.outputTranscription.text,
      }))
    }

    if (msg.serverContent?.inputTranscription) {
      ws.send(JSON.stringify({
        type: 'user_transcript',
        text: msg.serverContent.inputTranscription.text,
      }))
    }
    // check interruption
      if (msg.serverContent?.interrupted) {
        ws.send(JSON.stringify({ type: 'interrupted' }))
        console.log('Gemini interrupted')
      }
    // ────────────────────────────────────────────────────────────

    if (msg.serverContent?.turnComplete) {
      ws.send(JSON.stringify({ type: 'turn_complete' }))
    }
  }
}, 50)

  ws.on('close', () => {
    console.log('Client disconnected')
    clearInterval(drainInterval)
    if (geminiSession) {
      try { geminiSession.close() } catch (_) {}
      geminiSession = null
    }
  })
})



//routes
app.post('/login',login);

app.post('/signup',signup);

app.post('/canvas',addCanvas);

app.post('/slide',addSlide);

app.get('/canvas/:id',getCanvas);

app.get('/slides/:id',getSlides)


app.put('/slide/:slideId',updateSlide)

app.delete('/slide/:slideId',deleteSlide);

const PORT = process.env.PORT || 3000

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified Server running on port ${PORT}`)
  connectDB()
})