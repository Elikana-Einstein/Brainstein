
import { useCallback, useEffect } from "react";
import * as fabric from "fabric";

export default function useWhiteboardTools(
  fabricRef,
  activeTool,
  activeColor,
  activeSize
) {
  const applyTool = useCallback(() => {
    const canvas = fabricRef?.current;

    if (!canvas || canvas.disposed) return undefined;

    // Stop drawing with the previous tool.
    canvas.isDrawingMode = false;

    const handlers = [];
    let isDrawingShape = false;
    let startX = 0;
    let startY = 0;
    let currentShape = null;

    const on = (eventName, handler) => {
      canvas.on(eventName, handler);
      handlers.push([eventName, handler]);
    };

    const stopDrawing = () => {
      isDrawingShape = false;
      currentShape = null;
    };

    canvas.selection = !["rect", "circle", "line", "text"].includes(
      activeTool
    );

    canvas.defaultCursor =
      activeTool === "text" ? "text" : "crosshair";

    if (activeTool === "pen" || activeTool === "eraser") {
      const brush = new fabric.PencilBrush(canvas);

      brush.color =
        activeTool === "eraser" ? "#ffffff" : activeColor;

      brush.width =
        activeTool === "eraser" ? activeSize * 4 : activeSize;

      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;

      if (activeTool === "eraser") {
        canvas.defaultCursor = "cell";
      }
    }

    if (["rect", "circle", "line"].includes(activeTool)) {
      const onMouseDown = (event) => {
        const point = event.scenePoint;

        if (!point) return;

        isDrawingShape = true;
        startX = point.x;
        startY = point.y;

        const commonOptions = {
          stroke: activeColor,
          strokeWidth: activeSize,
          fill: "transparent",
          selectable: false,
          evented: false,
        };

        if (activeTool === "rect") {
          currentShape = new fabric.Rect({
            ...commonOptions,
            left: startX,
            top: startY,
            width: 0,
            height: 0,
          });
        } else if (activeTool === "circle") {
          currentShape = new fabric.Ellipse({
            ...commonOptions,
            left: startX,
            top: startY,
            rx: 0,
            ry: 0,
          });
        } else {
          currentShape = new fabric.Line(
            [startX, startY, startX, startY],
            {
              stroke: activeColor,
              strokeWidth: activeSize,
              strokeLineCap: "round",
              selectable: false,
              evented: false,
            }
          );
        }

        canvas.add(currentShape);
        canvas.requestRenderAll();
      };

      const onMouseMove = (event) => {
        if (!isDrawingShape || !currentShape) return;

        const point = event.scenePoint;

        if (!point) return;

        const width = point.x - startX;
        const height = point.y - startY;

        if (activeTool === "rect") {
          currentShape.set({
            left: Math.min(startX, point.x),
            top: Math.min(startY, point.y),
            width: Math.abs(width),
            height: Math.abs(height),
          });
        } else if (activeTool === "circle") {
          currentShape.set({
            left: Math.min(startX, point.x),
            top: Math.min(startY, point.y),
            rx: Math.abs(width) / 2,
            ry: Math.abs(height) / 2,
          });
        } else {
          currentShape.set({
            x2: point.x,
            y2: point.y,
          });
        }

        currentShape.setCoords();
        canvas.requestRenderAll();
      };

      const onMouseUp = () => {
        stopDrawing();
      };

      on("mouse:down", onMouseDown);
      on("mouse:move", onMouseMove);
      on("mouse:up", onMouseUp);
    }

    if (activeTool === "text") {
      const onMouseDown = (event) => {
        const point = event.scenePoint;

        if (!point) return;

        const text = new fabric.IText("Type here…", {
          left: point.x,
          top: point.y,
          fontSize: Math.max(activeSize * 3 + 12, 18),
          fill: activeColor,
          fontFamily: "DM Mono, monospace",
          selectable: true,
          editable: true,
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();

        canvas.requestRenderAll();
      };

      on("mouse:down", onMouseDown);
    }

    canvas.requestRenderAll();

    // Remove only the listeners installed by this hook.
    return () => {
      handlers.forEach(([eventName, handler]) => {
        canvas.off(eventName, handler);
      });

      stopDrawing();
    };
  }, [fabricRef, activeTool, activeColor, activeSize]);

  useEffect(() => {
    return applyTool();
  }, [applyTool]);
}
