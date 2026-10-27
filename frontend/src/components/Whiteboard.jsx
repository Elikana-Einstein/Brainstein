import React, { useRef, useEffect, useState } from 'react';
import useFabricCanvas from '../pages/FabricCanvas';
import useStore from '../zustand/store';
import { toast } from 'react-toastify';
import useWhiteboardDimensions from "../whiteboard/hooks/useWhiteboardDimensions.js";
/* ─── Inject Google Fonts once ─────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('wb-fonts')) {
  const link = document.createElement('link');
  link.id = 'wb-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
}

import {
  WHITEBOARD_PALETTE,
  STROKE_SIZES,
  WHITEBOARD_TOOLS,
} from "../whiteboard/hooks/whiteboard.constants.js";
import useWhiteboardTools from '../whiteboard/hooks/useWhiteboardTools.js';
import WhiteboardToolbar from '../whiteboard/components/WhiteboardToolbar.jsx';
import WhiteboardStatusBar from '../whiteboard/components/WhiteboardStatusBar.jsx';
import S from '../whiteboard/hooks/whiteboard.styles.js';



/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const Whiteboard = () => {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const dims = useWhiteboardDimensions(wrapRef);
  const [activeColor, setActiveColor] = useState(WHITEBOARD_PALETTE[0]);

  const [activeSize, setActiveSize] = useState(STROKE_SIZES[1]);
  const [activeTool, setActiveTool]   = useState('pen');
  const [isMounted, setIsMounted]     = useState(false);
  const { setColor, setWidth ,name,getSlides,currentCanvasId,updateSlide,setNavClear,navClear} = useStore();
  const isMount = useRef(false)

  useEffect(()=>{
    if(navClear>0){
      clearCanvas()
      toast.success("New canvas created successfully")
    }
  },[navClear])


  useEffect(()=>{
    getSlides()
  },[currentCanvasId])
  /* ── Init Fabric hook ───────────────────────────── */
  const { fabricRef, clearCanvas, saveCanvas,saveState ,zoomLevel,resetZoom, isPanningRef} = useFabricCanvas(canvasRef, {
    width: dims.width,
    height: dims.height,
    brushColor: activeColor,
    brushWidth: activeSize,
  });

  useEffect(() => { setIsMounted(true); }, []);

  /* ── Keep canvas dimensions in sync (Fabric v6) ─── */
  useEffect(() => {
    const c = fabricRef?.current;
    if (!c) return;
    c.set({ width: dims.width, height: dims.height });
    c.setDimensions({ width: dims.width, height: dims.height });
    c.renderAll();
  }, [dims]);

/* ── Apply tool logic to Fabric canvas ─────────── */
useWhiteboardTools(
  fabricRef,
  activeTool,
  activeColor,
  activeSize,
  saveState,
  isPanningRef
);
  const handleColor = (c) => { setActiveColor(c); setColor?.(c); };
  const handleSize  = (s) => { setActiveSize(s);  setWidth?.(s); };
  const hintText = {
    pen:    'Draw freely on the canvas',
    rect:   'Click & drag to draw a rectangle',
    circle: 'Click & drag to draw a circle',
    line:   'Click & drag to draw a line',
    text:   'Click anywhere to place text',
    eraser: 'Click & drag to erase',
  }[activeTool];

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <div style={S.page}>

      {/* Page heading */}
      <div style={S.heading}>
        <div style={S.brandRow}>
          <span style={S.brandDot} />
          <span style={S.brandName}>Brainstein</span>
          <span style={S.brandSlash}>/</span>
          <span className='text-red-700'>{name}</span>
          <span style={S.brandSub}>Workspace</span>
        </div>
      </div>

      {/* Card */}
      <div style={S.card}>

       {/* ══ TOOLBAR ══ */}
        <WhiteboardToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={handleColor}
          activeSize={activeSize}
          onSizeChange={handleSize}
          onClear={clearCanvas}
          onSave={saveCanvas}
          isUpdating={updateSlide}
          S={S}
        />

        {/* ══ CANVAS ══ */}
        <div ref={wrapRef} style={S.canvasWrap}>
          <canvas ref={canvasRef} style={{ display: 'block' , maxWidth: '100%', height:'100%'}} />
          <span style={S.hint}>{hintText}</span>
        </div>

        {/* ══ STATUS BAR ══ */}
        <WhiteboardStatusBar
          activeTool={activeTool}
          activeColor={activeColor}
          zoomLevel={zoomLevel}
          resetZoom={resetZoom}
          width={dims.width}
          height={dims.height}
          toolLabel={
            WHITEBOARD_TOOLS.find((tool) => tool.id === activeTool)?.label
          }
          S={S}
        />


      </div>
    </div>
  );
};



/* ─── Style map ─────────────────────────────────────── */
<S/>

export default Whiteboard;