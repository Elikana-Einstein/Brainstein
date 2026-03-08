import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import useStore from '../zustand/store';

const useFabricCanvas = (canvasRef, options) => {
  const { undoTrigger, redoTrigger, setFabricCanvasRef } = useStore();
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

    // ✅ NEW: Share the canvas ref via store so Navbar can snapshot it
    setFabricCanvasRef(canvas);

    canvas.on('path:created', saveState);
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

  // 7. Save canvas as PNG
  const saveCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = 'elick-canvas.png';
    link.href = dataURL;
    link.click();
  }, []);

  return { fabricRef, clearCanvas, saveCanvas };
};

export default useFabricCanvas;