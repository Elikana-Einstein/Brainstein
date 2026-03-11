import React from 'react'
import Whiteboard from './components/Whiteboard';
import Navbar from './components/Navbar';
import WelcomeModal from './pages/EntryModal';
import Panel from './components/Panel';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 flex">
      <Navbar/>
     <Whiteboard/>
     <Panel/>
     <WelcomeModal/>
    </div>
  );
}
 export default App;