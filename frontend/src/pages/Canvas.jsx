/**
 * Sessions.jsx — Canvas session slides viewer
 */
import React, { useEffect, useState } from 'react'
import { Clock, Layers, ChevronRight, Trash2, Pencil } from 'lucide-react'
import T from '../assets/Theme.js'
import useStore from '../zustand/store.js'
import axios from 'axios'
import { toast } from 'react-toastify'




const SessionCard = ({ session, onOpen, onDelete }) => {
  const [hov, setHov] = useState(false)
  const{setCurrentSlide,updateSlide,updateslideId,getSlides}=useStore()

  const handleEdit=(s)=>{
        setCurrentSlide(s.slide)

        useStore.setState({
          updateslideId:s._id
        })
        console.log(updateslideId,12345);
        
  }

  const toggleEditMode=()=>{
    if(updateSlide){
      useStore.setState({
    updateSlide:false,
    })
    }
    else{
 useStore.setState({
    updateSlide:true,
    })
    }
   
  }

const deleteSlide = async (slideId) => {
  try {
    const res = await axios.delete(`http://proper-flyingfish-elikana-f71f5476.koyeb.app/slide/${slideId}`);
    if (res.status === 201) {
      toast.success(res.data.message);
      getSlides()
    }
  } catch (err) {
    console.error('Error deleting slide:', err);
  }
};
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 12,
        border: `1px solid ${hov ? '#2e2e48' : T.border}`,
        background: hov ? T.surface2 : T.surface,
        overflow: 'hidden',
        transition: 'all .18s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {/* Canvas thumbnail */}
      <div
        onClick={() => onOpen(session)}
        style={{
          height: 90,
          background: `linear-gradient(135deg, #0d0d1a, #12122a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: `1px solid ${T.border}`,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {session.slide ? (
          <img src={session.previewImage} alt={session.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            {/* placeholder grid lines */}
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`v${i}`} x1={`${(i / 7) * 100}%`} y1="0" x2={`${(i / 7) * 100}%`} y2="100%" stroke="#6366f1" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i / 4) * 100}%`} x2="100%" y2={`${(i / 4) * 100}%`} stroke="#6366f1" strokeWidth="0.5" />
              ))}
            </svg>
            <Layers size={22} color={T.muted} />
          </>
        )}

        {/* open arrow on hover */}
        {hov && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={()=>handleEdit(session)}>
            <div style={{
              background: 'rgba(99,102,241,0.85)',
              borderRadius: 8, padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#fff',
              fontFamily: "'Syne', sans-serif",
            }}>
              Open <ChevronRight size={11} />
            </div>
          </div>
        )}
      </div>

      {/* Info row */}
      <div style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 600, color: T.text,
            fontFamily: "'Syne', sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
              <Clock size={9} /> {session.time}
            </span>
            <span style={{ fontSize: 10, color: T.subtext, fontFamily: "'DM Mono', monospace" }}>
              {session.slide.objects.length} strokes
            </span>
          </div>
        </div>
        <button
          onClick={()=>deleteSlide(session._id) }
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.subtext, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = T.subtext}
        >
          <Trash2 size={11} />
        </button>

        <button
          onClick={()=>toggleEditMode() }
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.subtext, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = T.subtext}
        >
          <Pencil size={11} />
        </button>
      </div>
    </div>
  )
}

const Sessions = () => {
const [showPrev, setShowPrev] = useState(false)
  const handleOpen   = (session) => console.log('Open session:', session.id) // replace with real nav
  const handleDelete = (id)      => setSessions(s => s.filter(x => x.id !== id))
const[work,setWork]=useState([])
const{id,saveDetails,setCurrentCanvasId,slides,getSlides}=useStore()
const getWork = async () => {
    const res = await axios.get(`http://proper-flyingfish-elikana-f71f5476.koyeb.app/canvas/${id}`)
    
  setWork(res.data.canvas)
  setCurrentCanvasId(res.data.canvas[0]._id);
  getSlides();
  
    
  }

useEffect(()=>{
  saveDetails()
  getWork()
},[])
  return (
    <div className='relative' style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header row */}
     <div className='px-2 flex items-center justify-between'>

        <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
          {slides.length} session{slides.length !== 1 ? 's' : ''}
        </span>
        <button onClick={()=>setShowPrev(prev=>!prev)} className='text-red-200 mt-1 bg-blue-500 rounded-lg px-2 cursor-pointer hover:bg-blue-700' style={{fontSize: 10,fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>Previous work</button>
      </div>

      <div className='my-2 bg-red-400 w-full h-0.5'></div>
               {showPrev && (
          <div
            className="absolute left-0 top-8 w-full bg-blue-300 shadow-lg rounded-md z-50 p-3"
          >
            {work.map((canvas)=>(
                <p className='bg-gray-600 py-1 px-2 cursor-pointer rounded-lg' key={canvas._id} onClick={()=>setCurrentCanvasId(canvas._id)}>{canvas.canvasTitle}</p>
            ))}
          </div>
        )}
      {/* Cards */}
      <div
        className="chat-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {slides.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, paddingTop: 40,
          }}>
            <Layers size={28} color={T.subtext} />
            <span style={{ fontSize: 12, color: T.muted, fontFamily: "'Syne', sans-serif" }}>
              No sessions yet
            </span>
            <span style={{ fontSize: 10, color: T.subtext, fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
              Start drawing on the canvas<br />to create your first session
            </span>
          </div>
        ) : (
          slides.map(s => (
            <SessionCard key={s.canvasId} session={s} onOpen={handleOpen} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}

export default Sessions