import {create} from 'zustand'


const useStore = create((set)=>({

    //state
b_color:'#3B82F6',
b_width:3,
chatopen:1,

//actions
openChat:()=>set((state)=>({chatopen:!state.chatopen})),
changeBrColor:(text)=>set({b_color:text}),
changeBrWidth:(text)=>set({b_width:text})


}))


export default useStore;