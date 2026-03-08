import { create } from 'zustand'

const useStore = create((set) => ({
  // Brush
  b_color: '#3B82F6',
  b_width: 3,
  changeBrColor: (color) => set({ b_color: color }),
  changeBrWidth: (width) => set({ b_width: width }),
  ws : new WebSocket('http://localhost:5000/gemini'),

  // Undo / Redo triggers
  undoTrigger: 0,
  redoTrigger: 0,
  triggerUndo: () => set((s) => ({ undoTrigger: s.undoTrigger + 1 })),
  triggerRedo: () => set((s) => ({ redoTrigger: s.redoTrigger + 1 })),

  // Chat panel
  chatopen: true,
  openChat: () => set((s) => ({ chatopen: !s.chatopen })),

  // Chat history
  ChatHistory: [],
  addChatMessage: (msg) =>
    set((s) => ({ ChatHistory: [...s.ChatHistory, msg] })),

  // Text input
  inputMessage: '',
  setInputMessage: (text) => set({ inputMessage: text }),

  // added new  Shared fabric canvas ref so Navbar can grab snapshots
  fabricCanvasRef: null,
  setFabricCanvasRef: (ref) => set({ fabricCanvasRef: ref }),
}))

export default useStore