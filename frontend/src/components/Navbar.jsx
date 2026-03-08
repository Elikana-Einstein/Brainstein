import React, { useEffect, useRef, useState } from 'react'
import { Mic, Video, Undo2, Redo2, MicOffIcon, VideoOffIcon, MessageSquare } from 'lucide-react'
import useStore from '../zustand/store'
import { audioManager } from '../utilities/Audio'

const Navbar = () => {
  const [open, SetOpen] = useState(1)
  const [micOn, setMicOn] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [geminiReady, setGeminiReady] = useState(false)

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
  ]
  const widthOptions = [2, 3, 4, 5]

  const {
    openChat, changeBrWidth, changeBrColor,
    b_color, b_width, triggerRedo, triggerUndo,
    addChatMessage, fabricCanvasRef,ws
  } = useStore()

  // WebSocket 1: Gemini voice transcription 
  const GeminiSocketRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket('http://localhost:5000/gemini')
    ws.onopen = () => {
      console.log('Gemini WebSocket connected')
      GeminiSocketRef.current = ws
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      addChatMessage(data)
    }
    ws.onerror = (e) => console.error('Gemini WS error', e)
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close() }
  }, [])

  // WebSocket 2: Gemini Live (AI sees canvas + talks back) 
  const geminiSocketRef = useRef(null)
  const canvasIntervalRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)

  useEffect(() => {
    //so basically these runs at the console
    ws.onopen = () => {
      console.log('Gemini WebSocket connected')
      geminiSocketRef.current = ws
      setGeminiReady(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      // AI is speaking — play audio
      if (data.type === 'audio') {
        audioQueueRef.current.push(data.data)
        if (!isPlayingRef.current) playNextAudio()
      }

      // Show AI transcript in chat
      if (data.type === 'ai_transcript' && data.text) {
        addChatMessage({ user: '', ai: data.text })
      }

      // Show user transcript in chat
      if (data.type === 'user_transcript' && data.text) {
        addChatMessage({ user: data.text, ai: '' })
      }

      // Stop audio if Gemini was interrupted
      if (data.control === 'stop_audio') {
        audioQueueRef.current = []
        isPlayingRef.current = false
      }
    }

    ws.onerror = (e) => console.error('Gemini WS error', e)

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close()
      clearInterval(canvasIntervalRef.current)
    }
  }, [])

  //  Play AI audio response 
  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }
    isPlayingRef.current = true
    const b64 = audioQueueRef.current.shift()
    try {
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      const audioCtx = new AudioContext({ sampleRate: 24000 })
      const buffer = audioCtx.createBuffer(1, bytes.length / 2, 24000)
      const channelData = buffer.getChannelData(0)
      const int16 = new Int16Array(bytes.buffer)
      for (let i = 0; i < int16.length; i++) {
        channelData[i] = int16[i] / 32768
      }
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(audioCtx.destination)
      source.onended = () => { audioCtx.close(); playNextAudio() }
      source.start()
    } catch (e) {
      console.error('Audio playback error', e)
      playNextAudio()
    }
  }

  //  Send canvas snapshot to Gemini every 3 seconds 
  const startCanvasStream = () => {
    canvasIntervalRef.current = setInterval(() => {
      const ws = geminiSocketRef.current
      const canvas = fabricCanvasRef

      if (!ws || ws.readyState !== WebSocket.OPEN || !canvas) return

      try {
        // Get canvas as JPEG base64 (smaller than PNG)
        const imageB64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
        ws.send(JSON.stringify({ image: imageB64 }))
      } catch (e) {
        console.error('Canvas snapshot error', e)
      }
    }, 3000) // every 3 seconds
  }

  const stopCanvasStream = () => {
    clearInterval(canvasIntervalRef.current)
  }

  //  Mic toggle 
  const toggleMic = async (micStatus) => {
    if (micStatus) {
      // Send audio to BOTH Groq (transcription) and Gemini (live conversation)
      if (GeminiSocketRef.current) {
        await audioManager.turnMicOn(GeminiSocketRef.current)
      }
      startCanvasStream() // start sending canvas when mic is on
    } else {
      audioManager.turnMicOff()
      stopCanvasStream()
    }
  }

  useEffect(() => { toggleMic(micOn) }, [micOn])
  useEffect(()=>{
    if(videoOn){
      startCanvasStream()
      console.log(123);
      
    }else{
      stopCanvasStream()
      console.log(2456);
      
    }
  },[videoOn])

  return (
    <div>
      {open ? (
        // Collapsed navbar 
        <div className="fixed top-4 left-2 h-screen w-8 bg-gray-200 backdrop-blur-md shadow-xl border border-white/20 z-10">
          <button className='flex flex-col p-2 gap-1' onClick={() => SetOpen(0)}>
            <div className='w-4 h-1 bg-gray-800'></div>
            <div className='w-4 h-1 bg-gray-800'></div>
            <div className='w-4 h-1 bg-gray-800'></div>
          </button>

          <div className='pt-10 flex flex-col pl-1 pr-1 gap-y-8'>
            {/* Mic — glows green when on */}
            <button
              onClick={() => setMicOn(!micOn)}
              className={`rounded-full p-1 transition-all ${micOn ? 'bg-green-400 shadow-lg shadow-green-300' : ''}`}
            >
              {micOn ? <Mic size={24} /> : <MicOffIcon size={24} />}
            </button>

            <button onClick={() => setVideoOn(!videoOn)}>
              {videoOn ? <Video size={24} /> : <VideoOffIcon size={24} />}
            </button>

            <button onClick={openChat}>
              <MessageSquare size={24} />
            </button>

            <button><Undo2 onClick={triggerUndo} size={24} /></button>
            <button><Redo2 onClick={triggerRedo} size={24} /></button>
          </div>

          {/* Gemini status indicator */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${geminiReady ? 'bg-green-400' : 'bg-red-400'}`}
            title={geminiReady ? 'Gemini connected' : 'Gemini disconnected'} />
        </div>
      ) : (
        // ── Expanded brush panel 
        <div className="fixed top-4 left-0 h-[calc(100vh-2rem)] w-72 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 flex flex-col z-10">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full shadow-md transition-all duration-300" style={{ backgroundColor: b_color }} />
            <h2 className="text-xl font-semibold text-gray-800">Brush Settings</h2>
            <div className='pl-5'>
              <button className='bg-red-400 rounded-full w-8 cursor-pointer' onClick={() => SetOpen(1)}>
                <h1 className='text-2xl'>X</h1>
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-400 rounded-full"></span>
              Color palette
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => changeBrColor(c.value)}
                  className={`group relative h-14 rounded-xl shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 ${b_color === c.value ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}
                  style={{ backgroundColor: c.value }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black/20 rounded-xl transition-opacity">
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-400 rounded-full"></span>
              Stroke width
            </h3>
            <div className="flex gap-2 flex-wrap">
              {widthOptions.map((w) => (
                <button
                  key={w}
                  onClick={() => changeBrWidth(w)}
                  className={`flex-1 min-w-10 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md active:scale-95 ${b_width === w ? 'bg-linear-to-br from-blue-500 to-purple-500 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs">px</span>
                    <span className="text-lg font-bold">{w}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">Live preview</p>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">Selected:</div>
                <div className="h-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: b_color, width: `${b_width * 8}px`, maxWidth: '100px' }} />
                <div className="text-xs text-gray-400 font-mono">{b_width}px</div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 text-xs text-gray-400 flex justify-between items-center border-t border-gray-100">
            <span>✨ click any color or width</span>
            <span className="font-mono text-white px-2 py-1 rounded-full" style={{ backgroundColor: b_color }}>
              {colorOptions.find(c => c.value === b_color)?.name || 'Custom'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Navbar