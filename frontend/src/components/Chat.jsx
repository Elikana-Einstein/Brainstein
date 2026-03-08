/**
 * Chat.jsx — Elick AI Chat Panel
 * 
 * This is the main chat sidebar component. It handles:
 *  - Sending text messages to the AI
 *  - Voice notes (hold mic to record, release to send)
 *  - File attachments (any file type)
 *  - Stopping the AI mid-response (restores your text so you can edit & resend)
 * 
 * It talks to two Flask endpoints:
 *  - POST /chat  → sends text, gets AI response
 *  - POST /voice → sends audio blob, gets transcription + AI response
 */

import { BrainCircuit, SendHorizontal, Loader2, StopCircle, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon, Film, Music, Archive } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import useStore from '../zustand/store'
import ChatInterface from '../pages/Ai'

// changed  these to restyle the whole panel but you can chaange if you wish to./
const BG = '#dce8f5'       // outer background
const CARD = '#eaf2fb'     // input box & file preview background
const BORDER = '#c2d8ee'   // all borders
const ACCENT = '#4f8ef7'   // primary blue (buttons, icons)
const ACCENT2 = '#7c6ef7'  // secondary purple (gradient end)
const TEXT = '#1e3a5f'     // main text
const SUBTEXT = '#5a7fa8'  // secondary / hint text

//Returns the right icon based on the attached file's MIME type
const getFileIcon = (file) => {
    if (!file) return <FileText size={13} color={ACCENT} />
    const t = file.type
    if (t.startsWith('image/')) return <ImageIcon size={13} color={ACCENT} />
    if (t.startsWith('video/')) return <Film size={13} color={ACCENT} />
    if (t.startsWith('audio/')) return <Music size={13} color={ACCENT} />
    if (t.includes('zip') || t.includes('rar') || t.includes('tar')) return <Archive size={13} color={ACCENT} />
    return <FileText size={13} color={ACCENT} /> // fallback for PDFs, docs, etc.
}

// Human-readable file size (e.g. "1.4 MB") i think this is a better apploach
const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const Chat = () => {
    const { chatopen, openChat, inputMessage, setInputMessage, addChatMessage,ws } = useStore()

    // Whether we're waiting for the AI to respond
    const [loading, setLoading] = useState(false)

    // Used to cancel a fetch request mid-flight (the "stop" button)
    const abortControllerRef = useRef(null)

    // We save the user's typed text here before clearing the input,
    // so if they hit Stop we can put it back — just like Claude does
    const currentUserTextRef = useRef('')

    // Voice recording state
    const [recording, setRecording] = useState(false)
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    // Waveform bar heights — updated every 100ms while recording
    const [waveformHeights, setWaveformHeights] = useState(Array(10).fill(4))
    const waveformInterval = useRef(null)

    // File attachment
    const fileInputRef = useRef(null)
    const [attachedFile, setAttachedFile] = useState(null)

    //  Animate waveform bars while mic is active 
    useEffect(() => {
        if (recording) {
            waveformInterval.current = setInterval(() => {
                setWaveformHeights(Array(10).fill(0).map(() => 4 + Math.random() * 20))
            }, 100)
        } else {
            clearInterval(waveformInterval.current)
            setWaveformHeights(Array(10).fill(4))
        }
        return () => clearInterval(waveformInterval.current)
    }, [recording])
    // Stop button — cancels the AI request and restores the user's text 
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setLoading(false)

        // Remove the pending "..." message from the chat so it's like it never happened
        useStore.setState((s) => {
            const updated = [...s.ChatHistory]
            for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].ai === '...') {
                    updated.splice(i, 1)
                    break
                }
            }
            return { ChatHistory: updated }
        })

        // Put the user's original text back so they can edit and resend
        setInputMessage(currentUserTextRef.current)
        currentUserTextRef.current = ''
    }

    //  Send a text message 
    const handleSend = async () => {
        const text = inputMessage.trim()
        if ((!text && !attachedFile) || loading) return
        ws.send(text)

        // If a file is attached, prefix the message with the filename
        const userMsg = attachedFile
            ? `📎 ${attachedFile.name}${text ? '\n' + text : ''}`
            : text

        // Save text before we clear the input (needed for Stop restore)
        currentUserTextRef.current = text

        // Show the user's message immediately with a "..." placeholder for the AI
        addChatMessage({ user: userMsg, ai: '...' })
        setInputMessage('')
        setAttachedFile(null)
        setLoading(true)
        abortControllerRef.current = new AbortController()

        try {
           /* const res = await fetch('http://localhost:5000/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text || attachedFile?.name }),
                signal: abortControllerRef.current.signal,
            })*/
           // const data = await res.json()

            // Replace the "..." placeholder with the real AI response
            useStore.setState((s) => {
                const updated = [...s.ChatHistory]
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].ai === '...') { updated[i] = { user: userMsg, ai: data.ai }; break }
                }
                return { ChatHistory: updated }
            })
        } catch (err) {
            // If the user hit Stop, the AbortError is handled in handleStop — ignore it here
            if (err.name === 'AbortError') return

            // Any other error (server down, network issue)
            useStore.setState((s) => {
                const updated = [...s.ChatHistory]
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].ai === '...') { updated[i] = { ...updated[i], ai: 'Could not reach server.' }; break }
                }
                return { ChatHistory: updated }
            })
        } finally {
            setLoading(false)
            abortControllerRef.current = null
        }
    }

    //  Enter key sends, Shift+Enter adds a new line 
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    //  Voice note: hold button → records → release → transcribes + AI reply 
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioChunksRef.current = []
            const mr = new MediaRecorder(stream)
            mediaRecorderRef.current = mr

            mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }

            mr.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(t => t.stop()) // release mic
                await sendVoiceNote(blob)
            }

            mr.start()
            setRecording(true)
        } catch (err) {
            console.error('Mic error — make sure browser has mic permission:', err)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
    }

    // ── Sends the recorded audio blob to Flask /voice 
    const sendVoiceNote = async (blob) => {
        setLoading(true)
        addChatMessage({ user: 'Voice message', ai: '...' })
        abortControllerRef.current = new AbortController()

        try {
            const formData = new FormData()
            formData.append('audio', blob, 'voice.webm')

            const res = await fetch('http://localhost:5000/voice', {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal
            })
            const data = await res.json()

            // Show what the user actually said + the AI's reply
            useStore.setState((s) => {
                const updated = [...s.ChatHistory]
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].ai === '...') {
                        updated[i] = { user: `"${data.user}"`, ai: data.ai }
                        break
                    }
                }
                return { ChatHistory: updated }
            })
        } catch (err) {
            if (err.name === 'AbortError') return
        } finally {
            setLoading(false)
            abortControllerRef.current = null
        }
    }

    // ── File picker — accepts any file type 
    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) setAttachedFile(file)
        e.target.value = '' // reset so the same file can be re-selected
    }

    // Send button is only active when there's text or a file, and we're not busy
    const canSend = (inputMessage.trim() || attachedFile) && !loading && !recording

    return (
        <div>
            {chatopen && (
                <div style={{
                    position: 'fixed', top: '1rem', right: '0.75rem',
                    height: 'calc(100vh - 2rem)', width: '300px',
                    display: 'flex', flexDirection: 'column',
                    background: BG,
                    borderRadius: '20px',
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 8px 32px rgba(79,142,247,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    overflow: 'hidden', zIndex: 10,
                    fontFamily: "'DM Sans', system-ui, sans-serif"
                }}>

                    {/* ── Header ── */}
                    <div style={{
                        padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#d0e4f4',
                        borderBottom: `1px solid ${BORDER}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' }}>
                                    Hello, how can i help you?
                                </div>
                            </div>
                        </div>
                        {/* Close button — hides the chat panel */}
                        <button onClick={openChat} style={{
                            background: 'rgba(79,142,247,0.1)', border: `1px solid ${BORDER}`,
                            cursor: 'pointer', width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: SUBTEXT, fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
                        }}>✕</button>
                    </div>

                    {/* ── Message history (scrollable) ── */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', scrollbarWidth: 'none' }}>
                        <ChatInterface />
                    </div>

                    {/* ── File preview — shown after user picks a file ── */}
                    {attachedFile && (
                        <div style={{
                            margin: '0 10px 8px', padding: '8px 12px',
                            background: CARD, borderRadius: 10,
                            border: `1px solid ${BORDER}`,
                            display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            {getFileIcon(attachedFile)}
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {attachedFile.name}
                                </div>
                                <div style={{ fontSize: 10, color: SUBTEXT }}>{formatSize(attachedFile.size)}</div>
                            </div>
                            {/* Remove the attached file */}
                            <button onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SUBTEXT, padding: 2 }}>
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Waveform which is only visible while mic is recording ─ */}
                    {recording && (
                        <div style={{
                            margin: '0 10px 8px', padding: '8px 14px',
                            background: '#fee2e2', borderRadius: 10,
                            border: '1px solid #fecaca',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            {/* Pulsing red dot */}
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', flexShrink: 0 }} />
                            {/* Animated bars — heights change every 100ms */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                {waveformHeights.map((h, i) => (
                                    <div key={i} style={{
                                        width: 3, height: h, borderRadius: 2,
                                        background: 'linear-gradient(to top, #ef4444, #f97316)',
                                        transition: 'height 0.1s ease'
                                    }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Recording</span>
                        </div>
                    )}

                    {/* ── Input box + toolbar ── */}
                    <div style={{
                        margin: '0 10px 10px',
                        background: CARD,
                        borderRadius: 14,
                        border: `1.5px solid ${BORDER}`,
                        boxShadow: '0 2px 8px rgba(79,142,247,0.08)',
                        overflow: 'hidden'
                    }}>
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={recording ? 'Release mic to send...' : 'Ask me anything...'}
                            disabled={loading || recording}
                            rows={2}
                            style={{
                                width: '100%', padding: '11px 14px', resize: 'none',
                                background: 'transparent', border: 'none', outline: 'none',
                                color: TEXT, fontSize: 13, lineHeight: 1.5,
                                fontFamily: 'inherit', boxSizing: 'border-box'
                            }}
                        />

                        {/* Action buttons row  */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '4px 10px 10px'
                        }}>
                            {/* Status hint */}
                            <span style={{ fontSize: 10, color: SUBTEXT, fontWeight: 500 }}>
                                {loading ? 'Thinking...' : recording ? 'Release to send' : 'Enter to send'}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                                {/*  File attach input accepts any file type */}
                                {!loading && !recording && (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="*/*"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                        <button onClick={() => fileInputRef.current.click()} title="Attach any file"
                                            style={btnStyle(BORDER, CARD)}>
                                            <Paperclip size={13} color={SUBTEXT} />
                                        </button>
                                    </>
                                )}

                                {/* stop or cancels the AI request, restores user text */}
                                {loading && (
                                    <button onClick={handleStop} title="Stop AI"
                                        style={{ ...btnStyle('#fecaca', '#fee2e2'), border: '1px solid #fca5a5' }}>
                                        <StopCircle size={13} color="#ef4444" />
                                    </button>
                                )}

                                {/* this part is for Mic. you just hold to record, release to send voice note */}
                                {!loading && (
                                    <button
                                        onMouseDown={startRecording} onMouseUp={stopRecording}
                                        onTouchStart={startRecording} onTouchEnd={stopRecording}
                                        title="Hold to record voice note"
                                        style={recording
                                            ? { ...btnStyle('#fecaca', '#fee2e2'), border: '1px solid #fca5a5' }
                                            : btnStyle(BORDER, CARD)
                                        }>
                                        {recording ? <MicOff size={13} color="#ef4444" /> : <Mic size={13} color={SUBTEXT} />}
                                    </button>
                                )}

                                {/*  send{lights up blue only when there's something to send }*/}
                                {!loading && !recording && (
                                    <button onClick={handleSend} disabled={!canSend} title="Send message"
                                        style={{
                                            background: canSend ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : '#dde9f5',
                                            border: 'none', borderRadius: 9, width: 30, height: 30,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: canSend ? 'pointer' : 'default', transition: 'all 0.2s',
                                            boxShadow: canSend ? '0 2px 10px rgba(79,142,247,0.35)' : 'none'
                                        }}>
                                        <SendHorizontal size={13} color={canSend ? 'white' : '#a0bad4'} />
                                    </button>
                                )}

                                {/* Spinner — shown while waiting for AI response */}
                                {loading && (
                                    <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 size={14} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            `}</style>
        </div>
    )
}


const btnStyle = (border, bg) => ({
    background: bg, border: `1px solid ${border}`,
    borderRadius: 9, width: 30, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s'
})

export default Chat