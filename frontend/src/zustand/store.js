import { create } from 'zustand'

const WS_URL = 'ws://localhost:3000/ws'

// ── Streaming Audio Player using Web Audio API ───────────────────────────────
// Decodes each PCM chunk and schedules it to play exactly when the previous
// chunk ends — no gaps, no overlap, true real-time streaming.
class StreamingAudioPlayer {
  constructor() {
    this.ctx         = null
    this.nextStartAt = 0   // when to schedule the next chunk
    this.sampleRate  = 24000
  }

  _ensureContext(sampleRate) {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx         = new AudioContext({ sampleRate })
      this.nextStartAt = 0
    }
  }

  addChunk(base64Pcm, mimeType) {
    try {
      const rateMatch  = mimeType?.match(/rate=(\d+)/)
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
      this._ensureContext(sampleRate)

      // Decode base64 → raw 16-bit PCM bytes
      const binary  = atob(base64Pcm)
      const bytes   = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      // Convert 16-bit PCM → float32 samples (-1.0 to 1.0)
      const samples    = bytes.length / 2
      const float32    = new Float32Array(samples)
      const dataView   = new DataView(bytes.buffer)
      for (let i = 0; i < samples; i++) {
        float32[i] = dataView.getInt16(i * 2, true) / 32768
      }

      // Create an AudioBuffer and fill it
      const audioBuffer = this.ctx.createBuffer(1, samples, sampleRate)
      audioBuffer.copyToChannel(float32, 0)

      // Schedule it to start right after the last chunk
      const now        = this.ctx.currentTime
      const startAt    = Math.max(this.nextStartAt, now)
      const source     = this.ctx.createBufferSource()
      source.buffer    = audioBuffer
      source.connect(this.ctx.destination)
      source.start(startAt)

      // Next chunk starts when this one ends
      this.nextStartAt = startAt + audioBuffer.duration
    } catch (err) {
      console.error('[StreamingAudioPlayer] chunk error:', err)
    }
  }

  reset() {
    this.nextStartAt = 0
  }
}

const player = new StreamingAudioPlayer()

// ── Zustand store ─────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  b_color: '#3B82F6',
  b_width: 3,
  changeBrColor: (color) => set({ b_color: color }),
  changeBrWidth: (width) => set({ b_width: width }),
  loading: false,

  ws: null,
  wsReady: false,

  connectWS: () => {
    const existing = get().ws
    if (existing && (
      existing.readyState === WebSocket.OPEN ||
      existing.readyState === WebSocket.CONNECTING
    )) return existing

    const socket = new WebSocket(WS_URL)

    socket.onopen = () => {
      console.log('[WS] Connected')
      set({ wsReady: true })
    }

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {

        // ── Each chunk: decode + schedule immediately ───────────────
        case 'audio_chunk': {
          const raw = msg.pcm || msg.audio
          if (raw) player.addChunk(raw, msg.mimeType)
          break
        }

        // ── Stream text token into chat ─────────────────────────────
        case 'text_chunk': {
          const history = get().ChatHistory
          const last    = history[history.length - 1]
          if (last && last.role === 'assistant' && !last.complete) {
            set({
              ChatHistory: [
                ...history.slice(0, -1),
                { ...last, text: last.text + msg.text },
              ],
            })
          } else {
            get().addChatMessage({
              role:      'assistant',
              text:      msg.text,
              timestamp: new Date().toLocaleTimeString(),
              complete:  false,
            })
          }
          break
        }

        // ── Turn done ───────────────────────────────────────────────
        case 'turn_complete': {
          player.reset()
          set({ loading: false })

          const history = get().ChatHistory
          const last    = history[history.length - 1]
          if (last && last.role === 'assistant') {
            set({
              ChatHistory: [
                ...history.slice(0, -1),
                { ...last, complete: true },
              ],
            })
          }
          break
        }

        case 'error':
          console.error('[WS Error]', msg.message)
          set({ loading: false })
          break
      }
    }

    socket.onclose = (e) => {
      console.log('[WS] Disconnected — reconnecting in 3s', e.code)
      set({ wsReady: false, ws: null })
      setTimeout(() => get().connectWS(), 3000)
    }

    socket.onerror = () => socket.close()

    set({ ws: socket })
    return socket
  },

  disconnectWS: () => {
    const socket = get().ws
    if (socket) {
      socket.onclose = null
      socket.close()
      set({ ws: null, wsReady: false })
    }
  },

  undoTrigger: 0,
  redoTrigger: 0,
  triggerUndo: () => set((s) => ({ undoTrigger: s.undoTrigger + 1 })),
  triggerRedo: () => set((s) => ({ redoTrigger: s.redoTrigger + 1 })),

  chatopen: true,
  openChat: () => set((s) => ({ chatopen: !s.chatopen })),

  ChatHistory: [],
  addChatMessage: (msg) =>
    set((s) => ({ ChatHistory: [...s.ChatHistory, msg] })),

  inputMessage: '',
  setInputMessage: (text) => set({ inputMessage: text }),
  setLoading:     (val)  => set({ loading: val }),

  fabricCanvasRef: null,
  setFabricCanvasRef: (ref) => set({ fabricCanvasRef: ref }),
}))

export default useStore