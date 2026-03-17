import { useState, useEffect, useRef } from 'react'
import AuthModal from './Auth'
import useStore from '../zustand/store'
import axios from 'axios'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

function EngineeringBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf, t = 0

    const draw = () => {
      t += 0.007
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const cols = 10, rows = 8

      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols) * W
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let r = 0; r <= rows; r++) {
        const y = (r / rows) * H
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      canvas._traces.forEach(tr => {
        const pulse = (Math.sin(t * tr.speed + tr.pulse) + 1) / 2
        const a = 0.06 + pulse * 0.22
        const x1 = tr.x * W, y1 = tr.y * H
        const x2 = x1 + Math.cos(tr.angle) * tr.len * W
        const y2 = y1 + Math.sin(tr.angle) * tr.len * H
        ctx.strokeStyle = `rgba(255,175,30,${a})`
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        const p = ((t * tr.speed * 0.4 + tr.pulse) % 1)
        ctx.fillStyle = `rgba(255,210,60,${a * 2.5})`
        ctx.beginPath()
        ctx.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `rgba(255,175,30,${a * 0.4})`
        ctx.lineWidth = 1
        ctx.strokeRect(x2 - 3, y2 - 3, 6, 6)
      })

      canvas._nodes.forEach(n => {
        const pulse = (Math.sin(t * n.speed + n.phase) + 1) / 2
        const x = (n.c / (cols - 1)) * W
        const y = (n.r / (rows - 1)) * H
        if (n.active) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 14)
          g.addColorStop(0, `rgba(255,175,30,${0.1 + pulse * 0.15})`)
          g.addColorStop(1, 'transparent')
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = n.active
          ? `rgba(255,175,30,${0.3 + pulse * 0.45})`
          : `rgba(255,255,255,${0.04 + pulse * 0.04})`
        ctx.beginPath(); ctx.arc(x, y, n.active ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill()
      })

      const sy = ((t * 55) % (H + 60)) - 30
      const sg = ctx.createLinearGradient(0, sy - 24, 0, sy + 24)
      sg.addColorStop(0, 'transparent')
      sg.addColorStop(0.5, 'rgba(255,175,30,0.04)')
      sg.addColorStop(1, 'transparent')
      ctx.fillStyle = sg
      ctx.fillRect(0, sy - 24, W, 48)

      raf = requestAnimationFrame(draw)
    }

    const init = () => {
      const cols = 10, rows = 8
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      canvas._nodes = Array.from({ length: cols * rows }, (_, i) => ({
        c: i % cols, r: Math.floor(i / cols),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        active: Math.random() > 0.55,
      }))
      canvas._traces = Array.from({ length: 14 }, () => ({
        x: Math.random(), y: Math.random(),
        angle: (Math.floor(Math.random() * 4) * Math.PI) / 2,
        len: 0.08 + Math.random() * 0.18,
        pulse: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      }))
    }

    init()
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        display: 'block', borderRadius: '20px',
      }}
    />
  )
}

const WelcomeModal = () => {
  const [show,        setShow]        = useState(false)
  const [closing,     setClosing]     = useState(false)
  const [topic,       setTopic]       = useState('')
  const [context,     setContext]     = useState('')
  const [notLoggedIn, setNotLoggedIn] = useState(false)

  const { loggedIn, setCurrentCanvasId, id, showLogin, setShowLogin, ws } = useStore()

  // Show modal on first visit
  useEffect(() => {
    if (!localStorage.getItem('hasVisited')) setShow(true)
  }, [])

  // When login succeeds — hide AuthModal, show workspace form
  useEffect(() => {
    if (loggedIn) {
      setNotLoggedIn(false)
    }
  }, [loggedIn])

  // When navbar login button is clicked — open modal and show auth
  useEffect(() => {
    if (showLogin) {
      setShow(true)
      setNotLoggedIn(true)
      setShowLogin(false)  // reset so it can fire again next time
    }
  }, [showLogin])

  const handleClose = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setNotLoggedIn(true)
      return
    }

    try {
      const response = await axios.post(
        'https://proper-flyingfish-elikana-f71f5476.koyeb.app/canvas',
        { canvasTitle: topic, context, userId: id }
      )
      ws?.send(JSON.stringify({
        type: 'text',
        text: `Dont reply to this message its just a general way of preparing you what the session will be about. Session will be about: ${context}`,
      }))

      if (response.status === 201) {
        toast.success(response.data.message)
        setClosing(true)
        setContext('')
        setTopic('')
        setCurrentCanvasId(response.data.canvasId)
        // Mark visited so modal doesn't reappear on refresh
        localStorage.setItem('hasVisited', 'true')
        setTimeout(() => { setShow(false); setClosing(false) }, 400)
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    }
  }

  if (!show) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

        .wm-wrap {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .wm-card {
          pointer-events: all;
          position: relative;
          width: min(480px, 93vw);
          border-radius: 20px;
          padding: 38px 36px 32px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow:
            0 0 0 1px rgba(255,175,30,0.06),
            0 40px 90px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.06);
          animation: wmRise 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }
        .wm-card.closing { animation: wmSink 0.35s ease both; }
        @keyframes wmRise {
          from { opacity:0; transform:translateY(28px) scale(0.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes wmSink {
          from { opacity:1; transform:translateY(0) scale(1) }
          to   { opacity:0; transform:translateY(16px) scale(0.97) }
        }
        .wm-card-inner { position: relative; z-index: 2; }
        .wm-card::after {
          content:''; position:absolute; top:0; left:36px; right:36px; height:1px; z-index:3;
          background: linear-gradient(90deg, transparent, rgba(255,175,30,0.6), transparent);
        }
        .wm-blob {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 1;
          filter: blur(50px);
        }
        .wm-blob-1 {
          width: 280px; height: 280px; top: -80px; right: -60px;
          background: radial-gradient(circle, rgba(255,160,20,0.22) 0%, transparent 70%);
          animation: wmBlob1 8s ease-in-out infinite;
        }
        .wm-blob-2 {
          width: 220px; height: 220px; bottom: -60px; left: -40px;
          background: radial-gradient(circle, rgba(30,80,255,0.12) 0%, transparent 70%);
          animation: wmBlob2 10s ease-in-out infinite;
        }
        @keyframes wmBlob1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,20px)} }
        @keyframes wmBlob2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-20px)} }
        .wm-tag {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 400; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,175,30,0.8);
          background: rgba(255,175,30,0.08);
          border: 1px solid rgba(255,175,30,0.18);
          border-radius: 99px; padding: 4px 11px; margin-bottom: 20px;
        }
        .wm-tag-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #ffaf1e;
          animation: wmBlink 1.8s ease-in-out infinite;
        }
        @keyframes wmBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .wm-title {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(26px, 4.5vw, 34px); line-height: 1.12;
          letter-spacing: -0.02em; color: #eae6dc; margin-bottom: 6px;
        }
        .wm-title span {
          background: linear-gradient(90deg, #ffaf1e, #ff5f10);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .wm-hint {
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          font-weight: 300; color: rgba(234,230,220,0.3);
          letter-spacing: 0.03em; margin-bottom: 30px;
        }
        .wm-label {
          display: block;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(234,230,220,0.38); margin-bottom: 7px;
        }
        .wm-field { margin-bottom: 18px; }
        .wm-input, .wm-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px; padding: 11px 13px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; font-weight: 300;
          color: #eae6dc; outline: none; resize: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .wm-input::placeholder, .wm-textarea::placeholder { color: rgba(234,230,220,0.18); }
        .wm-input:focus, .wm-textarea:focus {
          border-color: rgba(255,175,30,0.4);
          background: rgba(255,175,30,0.04);
          box-shadow: 0 0 0 3px rgba(255,175,30,0.07);
        }
        .wm-textarea { min-height: 90px; line-height: 1.65; }
        .wm-btn {
          width: 100%; margin-top: 6px; padding: 13px;
          border: none; border-radius: 11px; cursor: pointer;
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
          color: #07090f;
          background: linear-gradient(135deg, #ffaf1e 0%, #ff5f10 100%);
          box-shadow: 0 4px 22px rgba(255,160,20,0.3);
          position: relative; overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .wm-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(255,160,20,0.4); }
        .wm-btn:active { transform: translateY(0); }
        .wm-btn::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, rgba(255,255,255,0.16), transparent);
          opacity:0; transition: opacity 0.2s;
        }
        .wm-btn:hover::after { opacity: 1; }
      `}</style>

      <div className={`${!closing ? 'wm-wrap' : ''}`}>
        <div className={`wm-card${closing ? ' closing' : ''}`}>

          <div className="wm-blob wm-blob-1" />
          <div className="wm-blob wm-blob-2" />

          {notLoggedIn
            ? <AuthModal />
            : (
              <div className="wm-card-inner">
                <div className='bg-black p-6 rounded-3xl'>
                  <div className='flex justify-between'>
                    <div className="wm-tag"><span className="wm-tag-dot" />AI Canvas</div>
                    <button onClick={() => setShow(false)}>
                      <X color='red' />
                    </button>
                  </div>

                  <h1 className="wm-title">Set up your<br /><span>workspace.</span></h1>
                  <p className="wm-hint">// configure your session before opening the canvas</p>

                  <div className="wm-field">
                    <label className="wm-label">Topic</label>
                    <input
                      className="wm-input"
                      placeholder="A demo neural network"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="wm-field">
                    <label className="wm-label">Tell AI a little about your project</label>
                    <textarea
                      className="wm-textarea"
                      placeholder="I am building a small neural network to visualize forward pass and back propagation..."
                      value={context}
                      onChange={e => setContext(e.target.value)}
                    />
                  </div>

                  <button className="wm-btn" onClick={handleClose}>
                    Get Started →
                  </button>
                </div>
              </div>
            )
          }

        </div>
      </div>
    </>
  )
}

export default WelcomeModal