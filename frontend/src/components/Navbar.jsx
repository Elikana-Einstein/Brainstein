import React, { useEffect, useRef, useState } from 'react'

import {Mic,Video,Undo2,Redo2,MicOffIcon,VideoOffIcon,MessageSquare} from 'lucide-react'
import useStore from '../zustand/store'
import { audioManager } from '../utilities/Audio'

const Navbar = () => {
  
  const [open, SetOpen] = useState(1) // default width in px (will scale with multiplier)
  const [micOn,setMicon]=useState(false)
  const [videoOn,setVideoon]=useState(false)
  // Color presets – each button will show its actual color
  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
  ]

  // Width presets (in pixels, but we'll use a visual multiplier)
  const widthOptions = [2,3,4,5]

  const {openChat,changeBrWidth,changeBrColor,b_color,b_width,triggerRedo,triggerUndo,addChatMessage}=useStore();
// Inside your component
const socketRef = useRef(null); // 1. Create the container

useEffect(() => {
    // 2. Assign the connection to the Ref
    const ws = new WebSocket('ws://localhost:5000/audio');
    
    ws.onopen = () => {
        console.log("🚀 Connected to Flask WebSocket");
        socketRef.current = ws; 
    };
   ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    addChatMessage(data);
    // 1. Update your UI with the transcript
    //setChatHistory(prev => [...prev, { role: 'user', text: data.user }, { role: 'ai', text: data.ai }]);
//
    //// 2. Speak the AI's response
    //const utterance = new SpeechSynthesisUtterance(data.ai);
    //window.speechSynthesis.speak(utterance);
    }

    return () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
    };
}, []);

const toggleMic = async (micStatus) => {
    if (micStatus) {
        // 3. Pass the current value of the Ref
        if (socketRef.current) {
            await audioManager.turnMicOn(socketRef.current); 
        } else {
            console.error("WebSocket not connected yet!");
        }
    } else {
        audioManager.turnMicOff();
    }
};
useEffect(()=>{
  toggleMic(micOn);
},[micOn])
  return (
    <div>
        {open ?
    <div className="fixed top-4 left-2 h-screen w-8 bg-gray-200 backdrop-blur-md  shadow-xl border border-white/20 z-10  ">
            <button className='flex flex-col p-2 gap-1' onClick={()=>SetOpen(0)}>
            <div className='w-4 h-1 bg-gray-800'></div>
            <div className='w-4 h-1 bg-gray-800'></div>
            <div className='w-4 h-1 bg-gray-800'></div>

            </button>
        <div className='pt-10 flex flex-col pl-1 pr-1 gap-y-8'>
            <button onClick={()=>setMicon(!micOn)}>
                {micOn?  <Mic  size={24}/> : <MicOffIcon  size={24}/>}
            </button>
            <button onClick={()=>setVideoon(!videoOn)}>
                {videoOn? <Video  size={24}/> : <VideoOffIcon  size={24}/>}
            </button>
            <button onClick={openChat}>
                <MessageSquare  size={24}/> 
            </button>
            <button>
                <Undo2 onClick={triggerUndo} size={24}/>

            </button>
            <button>
                <Redo2 onClick={triggerRedo} size={24}/>

            </button>
        </div>
        </div>:

        
    <div className="fixed top-4 left-0 h-[calc(100vh-2rem)] w-72 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 flex flex-col z-10">
      {/* Header with current color preview */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div 
          className="w-6 h-6 rounded-full shadow-md transition-all duration-300" 
          style={{ backgroundColor: b_color }}
        />
        <h2 className="text-xl font-semibold text-gray-800">Brush Settings</h2>
        <div className='pl-5'>
            <button className='bg-red-400 rounded-full w-8 cursor-pointer' onClick={()=>SetOpen(1)}>
            <h1 className='text-2xl'>X</h1>
            </button>
        </div>
      </div>

      {/* Color Section */}
      <div className="mt-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-400 rounded-full"></span>
          Color palette
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {colorOptions.map((c) => (
            <button
              key={c.value}
              onClick={()=>changeBrColor(c.value)}
              className={`
                group relative h-14 rounded-xl shadow-sm transition-all duration-200
                hover:scale-105 hover:shadow-md active:scale-95
                ${b_color === c.value ? 'ring-2 ring-offset-2 ring-blue-400' : ''}
              `}
              style={{ backgroundColor: c.value }}
            >
              {/* color name on hover */}
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black/20 rounded-xl transition-opacity">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Width Section */}
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
              className={`
                flex-1 min-w-10 py-3 rounded-xl font-medium transition-all duration-200
                hover:shadow-md active:scale-95
                ${
                  b_width === w
                    ? 'bg-linear-to-br from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs">px</span>
                <span className="text-lg font-bold">{w}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Live preview of selected width & color */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 mb-2">Live preview</p>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">Selected:</div>
            <div 
              className="h-1 rounded-full transition-all duration-300" 
              style={{ 
                backgroundColor: b_color,
                width: `${b_width * 8}px`, // visual scaling
                maxWidth: '100px'
              }}
            />
            <div className="text-xs text-gray-400 font-mono">{b_width}px</div>
          </div>
        </div>
      </div>

      {/* Extra polish: current values summary */}
      <div className="mt-auto pt-6 text-xs text-gray-400 flex justify-between items-center border-t border-gray-100">
        <span>✨ click any color or width</span>
        <span className="font-mono text-white px-2 py-1 rounded-full" style={{backgroundColor:b_color}}>
          {colorOptions.find(c => c.value === b_color)?.name || 'Custom'}
        </span>
      </div>
    </div>
        }

    </div>

  )
}

export default Navbar