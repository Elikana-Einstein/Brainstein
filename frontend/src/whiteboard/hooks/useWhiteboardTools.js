
import { useCallback, useEffect } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";
export default function useWhiteboardTools(
  fabricRef,
  activeTool,
  activeColor,
  activeSize,
  saveState,
  isPanningRef
) {
  const applyTool = useCallback(() => {
    const canvas = fabricRef?.current;

    if (!canvas || canvas.disposed) return undefined;
    const isPenStroke = (object) => {
  return object?.type === "path";
};


    // Stop drawing with the previous tool.
    canvas.isDrawingMode = false;

    const handlers = [];
    let isDrawingShape = false;
    let startX = 0;
    let startY = 0;
    let currentShape = null;
    let isErasing = false;
    let hasErased = false;

    const on = (eventName, handler) => {
      canvas.on(eventName, handler);
      handlers.push([eventName, handler]);
    };

    const stopDrawing = () => {
        isDrawingShape = false;
        currentShape = null;
        isErasing = false;
    };
const selectionTools = ["select"];
const isSelectTool = selectionTools.includes(activeTool);

canvas.selection = isSelectTool;
canvas.controlsAboveOverlay = true;
canvas.uniformScaling = false;
canvas.skipTargetFind = !isSelectTool;

canvas.defaultCursor =
  activeTool === "select"
    ? "default"
    : activeTool === "text"
      ? "text"
      : activeTool === "eraser"
        ? "cell"
        : "crosshair";
if (isSelectTool) {
  canvas.getObjects().forEach((object) => {
    object.set({
      selectable: true,
      evented: true,
    });
  });
}
if (activeTool === "pen") {
  const brush = new fabric.PencilBrush(canvas);

  brush.color = activeColor;
  brush.width = activeSize;
  brush.strokeLineCap = "round";
  brush.strokeLineJoin = "round";

  canvas.freeDrawingBrush = brush;
  canvas.isDrawingMode = true;
}

if (activeTool === "eraser") {
  // Only freehand pen paths can be erased.
  const isPenStroke = (object) => object?.type === "path";

  canvas.getObjects().forEach((object) => {
    object.set("erasable", isPenStroke(object));
  });

  const eraser = new EraserBrush(canvas);
  eraser.width = activeSize * 4;

  const onEraseEnd = async (event) => {
    // Commit the erase ourselves so we can save one history state.
    event.preventDefault();

    try {
      const { path, targets } = event.detail;

      if (targets?.length) {
        await eraser.commit({ path, targets });
        saveState();
      }
    } catch (error) {
      console.error("Failed to commit erasing:", error);
    }
  };

 
  const disposeEraserEnd = eraser.on("end", onEraseEnd);

handlers.push([
  "eraser:cleanup",
  () => {
    if (typeof disposeEraserEnd === "function") {
      disposeEraserEnd();
    }
  },
]);
 


if (activeTool === "select") {
  const onDoubleClick = (event) => {
    const target = event.target;

    if (target && target.isType("i-text", "text", "textbox")) {
      canvas.setActiveObject(target);
      target.enterEditing();
      canvas.requestRenderAll();
    }
  };

  on("mouse:dblclick", onDoubleClick);
}


  canvas.freeDrawingBrush = eraser;
  canvas.isDrawingMode = true;
  canvas.defaultCursor = "cell";
  canvas.selection = false;
}

    if (["rect", "circle", "line"].includes(activeTool)) {
      const onMouseDown = (event) => {
        if (isPanningRef?.current) return;
        const point = event.scenePoint;

        if (!point) return;

        isDrawingShape = true;
        startX = point.x;
        startY = point.y;

        const commonOptions = {
               stroke: activeColor,
               strokeWidth: activeSize,
               strokeUniform: true,
               fill: "transparent",
               selectable: true,
               evented: true,
               objectCaching: false,
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
          currentShape = new fabric.Polyline(
  [
    { x: startX, y: startY },
    { x: startX, y: startY },
  ],
  {
    fill: "transparent",
    stroke: activeColor,
    strokeWidth: activeSize,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    strokeUniform: true,
    selectable: true,
    evented: true,
    objectCaching: false,
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
    points: [
      { x: startX, y: startY },
      { x: point.x, y: point.y },
    ],
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

    // Avoid creating another text object when clicking existing text.
    if (event.target?.isType?.("i-text", "text", "textbox")) {
      return;
    }

    const text = new fabric.IText("", {
      left: point.x,
      top: point.y,
      fontSize: Math.max(activeSize * 3 + 12, 18),
      fill: activeColor,
      fontFamily: "DM Mono, monospace",
      selectable: true,
      evented: true,
      editable: true,
      objectCaching: false,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.requestRenderAll();
  };

  on("mouse:down", onMouseDown);
}


    canvas.requestRenderAll();

    // Remove only the listeners installed by this hook.
    return () => {
      handlers.forEach(([eventName, handler]) => {
  if (eventName === "eraser:cleanup") {
    handler();
  } else {
    canvas.off(eventName, handler);
  }
});

      stopDrawing();
    };
    }, [fabricRef, activeTool, activeColor, activeSize, saveState]);

  useEffect(() => {
    return applyTool();
  }, [applyTool]);
}
