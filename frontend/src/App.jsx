import React from 'react'
import Whiteboard from './components/Whiteboard';
import Navbar from './components/Navbar';
import Chat from './components/Chat';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 flex">
      <Navbar/>
     <Whiteboard/>
     <Chat/>
    </div>
  );
}
 export default App;