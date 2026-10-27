import { useEffect, useRef, useCallback, useState } from "react";
import * as fabric from 'fabric';
import useStore from '../zustand/store';
import axios from 'axios';
import { apiUrl } from '../api/api';
import {toast} from 'react-toastify'
const useFabricCanvas = (canvasRef, options) => {
  const { undoTrigger, redoTrigger, setFabricCanvasRef,currentCanvasId,getSlides,currentSlide,updateSlide,updateslideId } = useStore();
  const fabricRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const isPanningRef = useRef(false);
  const isRestoringRef = useRef(false);
const [zoomLevel, setZoomLevel] = useState(1);
  const saveState = useCallback(() => {
    if (isRestoringRef.current || !fabricRef.current) return;
    const json = fabricRef.current.toObject();
    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }, []);
   
  
  // 1. Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: options.width || 800,
      height: options.height || 600,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    }
  
  );
const handleMouseWheel = (opt) => {
  const event = opt.e;
  // Zoom only when Ctrl is held.
  if (!event.ctrlKey) return;

  let zoom = canvas.getZoom();
  zoom *= 0.999 ** event.deltaY;

  zoom = Math.min(4, Math.max(0.1, zoom));

  canvas.zoomToPoint(
    new fabric.Point(event.offsetX, event.offsetY),
    zoom
  );
setZoomLevel(zoom);
  event.preventDefault();
  event.stopPropagation();
};

canvas.on("mouse:wheel", handleMouseWheel);


let isPanning = false;
let spacePressed = false;
let lastPointer = null;

const handleKeyDown = (event) => {
  if (event.code === "Space" && !event.repeat) {
    const tagName = event.target?.tagName?.toLowerCase();

    // Don't hijack Space while typing in inputs or text.
    if (
      tagName === "input" ||
      tagName === "textarea" ||
      event.target?.isContentEditable
    ) {
      return;
    }

    spacePressed = true;
    event.preventDefault();
  }
};

const handleKeyUp = (event) => {
  if (event.code === "Space") {
    spacePressed = false;
    isPanning = false;
    lastPointer = null;

    canvas.defaultCursor = "default";
    canvas.setCursor("default");
  }
};

const handleMouseDown = (opt) => {
  if (!spacePressed) return;
  isPanningRef.current = true;

  isPanning = true;
  lastPointer = {
    x: opt.e.clientX,
    y: opt.e.clientY,
  };

  canvas.setCursor("grabbing");
  opt.e.preventDefault();
};

const handleMouseMove = (opt) => {
  if (!isPanning || !lastPointer) return;

  const event = opt.e;
  const vpt = canvas.viewportTransform;

  vpt[4] += event.clientX - lastPointer.x;
  vpt[5] += event.clientY - lastPointer.y;

  lastPointer = {
    x: event.clientX,
    y: event.clientY,
  };

  canvas.requestRenderAll();
  event.preventDefault();
};

const handleMouseUp = () => {
  isPanning = false;
  lastPointer = null;
  isPanningRef.current = false;

  canvas.setCursor(spacePressed ? "grab" : "default");
};

canvas.on("mouse:down", handleMouseDown);
canvas.on("mouse:move", handleMouseMove);
canvas.on("mouse:up", handleMouseUp);

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);


    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    fabricRef.current = canvas;
    historyRef.current = [canvas.toObject()];

    //set a slide to render it for editing and reference
   
    // ✅ NEW: Share the canvas ref via store so Navbar can snapshot it
    setFabricCanvasRef(canvas);

    canvas.on('path:created', saveState);
    canvas.on('object:added',    saveState); 
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    return () => {
  
canvas.off("mouse:down", handleMouseDown);
canvas.off("mouse:move", handleMouseMove);
canvas.off("mouse:up", handleMouseUp);

window.removeEventListener("keydown", handleKeyDown);
window.removeEventListener("keyup", handleKeyUp);

// Keep your existing zoom cleanup too.
canvas.off("mouse:wheel", handleMouseWheel);

setFabricCanvasRef(null);
canvas.dispose();

};
  }, [canvasRef]);

  useEffect(()=>{
        const loadSlide = async () => {
          const canvas = fabricRef.current;
          if (!canvas) return;
        
          isRestoringRef.current = true;
        
          try {
            await canvas.loadFromJSON(currentSlide);
            canvas.renderAll();
          
            // reset history
            historyRef.current = [currentSlide];
            redoRef.current = [];
          } finally {
            isRestoringRef.current = false;
          }
        };
        if(currentSlide){
          loadSlide()
        }
    },[currentSlide])


  // 2. Undo
  const undo = useCallback(async () => {
    if (historyRef.current.length <= 1 || isRestoringRef.current) return;
    isRestoringRef.current = true;
    const canvas = fabricRef.current;
    const currentState = historyRef.current.pop();
    redoRef.current.push(currentState);
    const previousState = historyRef.current[historyRef.current.length - 1];
    try {
      await canvas.loadFromJSON(previousState);
      canvas.renderAll();
    } finally {
      isRestoringRef.current = false;
    }
  }, []);

  // 3. Redo
  const redo = useCallback(async () => {
    if (redoRef.current.length === 0 || isRestoringRef.current) return;
    isRestoringRef.current = true;
    const canvas = fabricRef.current;
    const nextState = redoRef.current.pop();
    historyRef.current.push(nextState);
    try {
      await canvas.loadFromJSON(nextState);
      canvas.renderAll();
    } finally {
      isRestoringRef.current = false;
    }
  }, []);

  const resetZoom = useCallback(() => {
  const canvas = fabricRef.current;
  if (!canvas) return;

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();

  setZoomLevel(1);
}, []);

useEffect(() => {
  const handleDeleteKey = (e) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;

    // Don't delete shapes while typing
    const target = e.target;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable
    ) {
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();

    if (activeObjects.length === 0) return;

    e.preventDefault();

    activeObjects.forEach((object) => {
      canvas.remove(object);
    });

    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  window.addEventListener("keydown", handleDeleteKey);

  return () => {
    window.removeEventListener("keydown", handleDeleteKey);
  };
}, []);
  // 4. Trigger listeners
  useEffect(() => { if (undoTrigger > 0) undo(); }, [undoTrigger, undo]);
  useEffect(() => { if (redoTrigger > 0) redo(); }, [redoTrigger, redo]);

  // 5. Brush updates
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = options.brushColor || '#000000';
      canvas.freeDrawingBrush.width = options.brushWidth || 5;
    }
  }, [options.brushColor, options.brushWidth]);

  // 6. Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
   
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    saveState();
  }, [saveState]);


  //save canvas to database
  const saveCanvas = useCallback(async () => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // 1️⃣ JSON representation of all objects
      const jsonData = canvas.toJSON();

      // 2️⃣ PNG image for preview
      const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });

      // Prepare payload
      const payload = {
        canvasId: currentCanvasId,      
        slide:jsonData,                      // Fabric.js JSON
        previewImage: dataURL,             // PNG as base64
      };
      try {
      // Send to backend

      
      if(!updateSlide){
       const res = await axios.post(`${apiUrl()}/slide`, payload);
        if(res.status == 201){
         toast.success(res.data.message);
         getSlides()
         useStore.setState({
          updateSlide:false
         })
       }
      }else{
        
     
       const res = await axios.put(`${apiUrl()}/slide/${updateslideId}`, payload);
        if(res.status == 201){
         toast.success(res.data.message);
         getSlides()
         useStore.setState({
          updateSlide:false
         })
       }

      }
      
      } catch (err) {
        console.error('Error saving canvas:', err);
      }

}, [currentCanvasId,updateSlide,updateslideId]);

  return { fabricRef, clearCanvas, saveCanvas, saveState, zoomLevel,resetZoom,isPanningRef};
};

export default useFabricCanvas;