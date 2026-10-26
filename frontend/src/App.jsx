import React from 'react'
import Whiteboard from './components/Whiteboard'
import Navbar from './components/Navbar'
import WelcomeModal from './pages/EntryModal'
import Panel from './components/Panel'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  return (
    <div className="min-h-screen p-8 flex bg-app">
      <Navbar />
      <Whiteboard />
      <Panel />
      <WelcomeModal />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"                // ← important: match the dull look
      />
    </div>
  )
}

export default App