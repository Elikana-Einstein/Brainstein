import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import useStore from '../zustand/store';
import axios from 'axios';
import {toast} from 'react-toastify'
const useFabricCanvas = (canvasRef, options) => {
  const { undoTrigger, redoTrigger, setFabricCanvasRef,currentCanvasId,getSlides,currentSlide,updateSlide,updateslideId } = useStore();
  const fabricRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const isRestoringRef = useRef(false);

  const saveState = useCallback(() => {
    if (isRestoringRef.current || !fabricRef.current) return;
    const json = fabricRef.current.toObject();
    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }, []);
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

  
  // 1. Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: options.width || 800,
      height: options.height || 600,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

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
      setFabricCanvasRef(null);
      canvas.dispose();
    };
  }, [canvasRef]);

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
       const res = await axios.post('https://proper-flyingfish-elikana-f71f5476.koyeb.app/slide', payload);
        if(res.status == 201){
         toast.success(res.data.message);
         getSlides()
         useStore.setState({
          updateSlide:false
         })
       }
      }else{
        
     
       const res = await axios.put(`https://proper-flyingfish-elikana-f71f5476.koyeb.app/slide/${updateslideId}`, payload);
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

  return { fabricRef, clearCanvas, saveCanvas };
};

export default useFabricCanvas;