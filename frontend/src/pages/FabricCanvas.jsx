import React from 'react'
import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

const FabricCanvas = (canvasRef,options) => {
  const fabricRef = useRef(null);
    useEffect(()=>{
        if (!canvasRef.current) return;

    // Create Fabric instance
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: options.width,
      height: options.height,
      backgroundColor: '#ffffff',
      isDrawingMode: true
    });

    // Setup brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = options.brushColor;
    canvas.freeDrawingBrush.width = options.brushWidth;


    // Optional: disable object selection
    canvas.selection = false;
    canvas.skipTargetFind = true;

    fabricRef.current = canvas;

     // Cleanup
    return () => {
      canvas.dispose();
    };
    },[]);
    // Update brush dynamically
    useEffect(() => {
      if (!fabricRef.current) return;
      fabricRef.current.freeDrawingBrush.color = options.brushColor;
    }, [options.brushColor]);  

    useEffect(() => {
      if (!fabricRef.current) return;
      fabricRef.current.freeDrawingBrush.width = options.brushWidth;
    }, [options.brushWidth]);    

return  fabricRef;
  
}

export default FabricCanvas