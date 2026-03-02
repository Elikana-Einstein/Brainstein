import React, { useRef } from 'react';
import FabricCanvas from '../pages/FabricCanvas';
import useStore from '../zustand/store';

const Whiteboard = ({
  
}) => {
  const canvasRef = useRef(null);
    const{b_width,b_color}=useStore();
  FabricCanvas(canvasRef, {
    width:window.innerWidth*0.8,
  height:600,
  brushColor :b_color,
  brushWidth :b_width
  });

  return (
    <div style={{ background: '#f3f4f6', padding: 20 }}>
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid #ccc',
          borderRadius: 8
        }}
      />
    </div>
  );
};

export default Whiteboard;