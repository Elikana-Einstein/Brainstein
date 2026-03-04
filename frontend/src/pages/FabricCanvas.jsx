import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import useStore from '../zustand/store';

const useFabricCanvas = (canvasRef, options) => {
  const { undoTrigger, redoTrigger } = useStore();
  const fabricRef = useRef(null);
  const historyRef = useRef([]); // Stack of JSON states
  const redoRef = useRef([]);
  const isRestoringRef = useRef(false);

  // Helper to capture current state
  const saveState = useCallback(() => {
    if (isRestoringRef.current || !fabricRef.current) return;
    
    const json = fabricRef.current.toObject();
    historyRef.current.push(json);
    
    // Limit history size to prevent memory leaks (e.g., last 50 actions)
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

    // Initial State
    historyRef.current = [canvas.toObject()];

    // Event Listeners
    canvas.on('path:created', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    return () => {
      canvas.dispose();
    };
  }, [canvasRef]); // Stability is key here

  // 2. Undo Logic
  const undo = useCallback(async () => {
    // We need at least 2 items: [initialState, firstAction]
    if (historyRef.current.length <= 1 || isRestoringRef.current) return;

    isRestoringRef.current = true;
    const canvas = fabricRef.current;

    // Move current state to redo stack
    const currentState = historyRef.current.pop();
    redoRef.current.push(currentState);

    // Get the state we want to go back to
    const previousState = historyRef.current[historyRef.current.length - 1];

    try {
      await canvas.loadFromJSON(previousState);
      canvas.renderAll();
    } finally {
      isRestoringRef.current = false;
    }
  }, []);

  // 3. Redo Logic
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

  // 4. Store Trigger Listeners
  useEffect(() => { if (undoTrigger > 0) undo(); }, [undoTrigger, undo]);
  useEffect(() => { if (redoTrigger > 0) redo(); }, [redoTrigger, redo]);

  // 5. Tool updates
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = options.brushColor || '#000000';
      canvas.freeDrawingBrush.width = options.brushWidth || 5;
    }
  }, [options.brushColor, options.brushWidth]);

  return fabricRef;
};

export default useFabricCanvas;