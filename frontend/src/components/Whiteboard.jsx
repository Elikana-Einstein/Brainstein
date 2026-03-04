import React, { useRef } from 'react';
// Rename the import to reflect that it's a hook
import FabricCanvas from '../pages/FabricCanvas'; 
import useStore from '../zustand/store';
import Buttons from '../pages/Buttons';

const Whiteboard = ({

}) => {
  const canvasRef = useRef(null);
  const { b_width, b_color } = useStore();

  // Call it as a hook (useFabricCanvas)
  FabricCanvas(canvasRef, {
        width:window.innerWidth*0.8,
  height:600,
    brushColor: b_color,
    brushWidth: b_width
  });

  return (
    <div className='bg-white/70 p-6 '>
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #ccc', borderRadius: 8,  }}
        
      />
      <Buttons />
    </div>
  );
};

export default Whiteboard;

