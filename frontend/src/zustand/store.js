import {create} from 'zustand'


const useStore = create((set)=>({

    //state
b_color:'#3B82F6',
b_width:3,
chatopen:1,
undoTrigger:0,
redoTrigger:0,
ChatHistory:[],

//actions
openChat:()=>set((state)=>({chatopen:!state.chatopen})),
triggerRedo:()=>set((state)=>({redoTrigger:state.redoTrigger+1})),
triggerUndo:()=>set((state)=>({undoTrigger:state.undoTrigger+1})),
changeBrColor:(text)=>set({b_color:text}),
changeBrWidth:(text)=>set({b_width:text}),
addChatMessage: (msg) => set((state) => ({ 
    ChatHistory: [...state.ChatHistory, msg] 
  })),


}))


export default useStore;