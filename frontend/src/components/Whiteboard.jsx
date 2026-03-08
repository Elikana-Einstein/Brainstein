///SO THIS PAGE I HAVE JUST DONE A DEMO YOU CAN CODE IT FROM SCRATCH 

import React, { useRef } from 'react';
//  Correct import name matches the hook export
import useFabricCanvas from '../pages/FabricCanvas';
import useStore from '../zustand/store';
import Buttons from '../pages/Buttons';

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const { b_width, b_color } = useStore();

  //  FIX: Called as a hook with correct name, destructure helpers
  const { clearCanvas, saveCanvas } = useFabricCanvas(canvasRef, {
    width: window.innerWidth * 0.8,
    height: 600,
    brushColor: b_color,
    brushWidth: b_width,
  });

  return (
    <div className='bg-white/70 p-6'>
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #ccc', borderRadius: 8 }}
      />
      {/*  FIX: Pass handlers down to Buttons */}
      <Buttons onClear={clearCanvas} onSave={saveCanvas} />
    </div>
  );
};

export default Whiteboard;