import { SendHorizonalIcon } from 'lucide-react'
import React, { useState } from 'react'
import useStore from '../zustand/store'

const Chat = () => {
    const{chatopen}=useStore()
    const [open,setOpen]=useState(true)
  return (
   <div>
    {chatopen &&(
         <div className="fixed   top-4 right-0 h-[calc(100vh-2rem)] w-72 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 flex flex-col z-10">
        <div className='border-blue-100 border-2 relative h-screen'>
            <h2 className='p-1 italic '>Describe here what you are thinking about how you would like the agent to work with you</h2>
        <div className='border bottom-0 absolute w-full border-black p-2'>
            <textarea name=""  id="" placeholder='its an idea about visualizing a neural network' className='w-full p-1'>
                
            </textarea>
            <div className='place-self-end pr-2'>
                <button>
                <SendHorizonalIcon size={15}/>
                </button>
            </div>
        </div>
        </div>

       
        
    </div>
    )}
   </div>
  )
}

export default Chat