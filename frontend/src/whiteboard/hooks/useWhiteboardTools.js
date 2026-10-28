import { useCallback, useEffect } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";
import { buildShape, SHAPE_TYPES, ensureId } from "./shapeFactory.js";

const MIN_SHAPE_SIZE = 6; // drags smaller than this are treated as accidental clicks
const isTextObject = (o) => o?.isType?.("i-text", "text", "textbox");

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

    canvas.isDrawingMode = false;

    const handlers = [];
    const cleanups = [];
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

    const isSelectTool = activeTool === "select";

    /* ── Canvas mode for the active tool ───────────── */
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

    /* ── SELECT ────────────────────────────────────── */
    if (isSelectTool) {
      canvas.getObjects().forEach((object) => {
        // Labels stay attached to their shape, not independently selectable.
        if (object.labelOf) return;
        object.set({ selectable: true, evented: true });
      });

      // Double-click existing text to edit it.
      const onDoubleClick = (event) => {
        const target = event.target;
        if (isTextObject(target)) {
          canvas.setActiveObject(target);
          target.enterEditing();
          canvas.requestRenderAll();
        }
      };
      on("mouse:dblclick", onDoubleClick);
    }

    /* ── PEN ───────────────────────────────────────── */
    if (activeTool === "pen") {
      const brush = new fabric.PencilBrush(canvas);
      brush.color = activeColor;
      brush.width = activeSize;
      brush.strokeLineCap = "round";
      brush.strokeLineJoin = "round";

      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
    }

    /* ── ERASER (pen strokes only) ─────────────────── */
    if (activeTool === "eraser") {
      canvas.getObjects().forEach((object) => {
        object.set("erasable", object?.type === "path" && !object.id);
      });

      const eraser = new EraserBrush(canvas);
      eraser.width = activeSize * 4;

      const onEraseEnd = async (event) => {
        event.preventDefault();
        try {
          const { path, targets } = event.detail;
          if (targets?.length) {
            await eraser.commit({ path, targets });
            saveState?.();
          }
        } catch (error) {
          console.error("Failed to commit erasing:", error);
        }
      };

      const disposeEraserEnd = eraser.on("end", onEraseEnd);
      cleanups.push(() => {
        if (typeof disposeEraserEnd === "function") disposeEraserEnd();
      });

      canvas.freeDrawingBrush = eraser;
      canvas.isDrawingMode = true;
      canvas.defaultCursor = "cell";
      canvas.selection = false;
    }

    /* ── SHAPES (rect, circle, line, flowchart, arrow) ─ */
    if (SHAPE_TYPES.includes(activeTool)) {
      const make = (x1, y1, x2, y2) => {
        const shape = buildShape(activeTool, x1, y1, x2, y2, {
          color: activeColor,
          size: activeSize,
        });
        // `kind` lets get_canvas_state report "decision" instead of "polygon".
        shape?.set({ kind: activeTool });
        return shape;
      };

      const onMouseDown = (event) => {
        if (isPanningRef?.current) return;
        if (event.e?.button !== undefined && event.e.button !== 0) return;

        const point = event.scenePoint;
        if (!point) return;

        isDrawingShape = true;
        startX = point.x;
        startY = point.y;

        currentShape = make(startX, startY, startX + 1, startY + 1);
        if (currentShape) {
          canvas.add(currentShape);
          canvas.requestRenderAll();
        }
      };

      const onMouseMove = (event) => {
        if (!isDrawingShape || !currentShape || isPanningRef?.current) return;

        const point = event.scenePoint;
        if (!point) return;

        const nextShape = make(startX, startY, point.x, point.y);
        if (!nextShape) return;

        canvas.remove(currentShape);
        currentShape = nextShape;
        canvas.add(currentShape);
        canvas.requestRenderAll();
      };

      const onMouseUp = () => {
        if (!isDrawingShape) return;

        const shape = currentShape;
        stopDrawing();
        if (!shape) return;

        // Discard accidental clicks that produced a speck.
        const tooSmall =
          shape.getScaledWidth() < MIN_SHAPE_SIZE &&
          shape.getScaledHeight() < MIN_SHAPE_SIZE;
        if (tooSmall) {
          canvas.remove(shape);
          canvas.requestRenderAll();
          return;
        }

        ensureId(shape); // so the AI can see and target user-drawn shapes
        saveState?.();
      };

      on("mouse:down", onMouseDown);
      on("mouse:move", onMouseMove);
      on("mouse:up", onMouseUp);
    }

    /* ── TEXT ──────────────────────────────────────── */
    if (activeTool === "text") {
      const onMouseDown = (event) => {
        if (isPanningRef?.current) return;

        const point = event.scenePoint;
        if (!point) return;

        // Don't create a new text object on top of existing text.
        if (isTextObject(event.target)) return;

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
        ensureId(text);

        // Remove empty text when the user clicks away without typing.
        text.on("editing:exited", () => {
          if (!text.text?.trim()) {
            canvas.remove(text);
          } else {
            saveState?.();
          }
          canvas.requestRenderAll();
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.requestRenderAll();
      };

      on("mouse:down", onMouseDown);
    }

    canvas.requestRenderAll();

    /* ── Cleanup when the tool or settings change ──── */
    return () => {
      handlers.forEach(([eventName, handler]) => canvas.off(eventName, handler));
      cleanups.forEach((fn) => fn());
      stopDrawing();
    };
  }, [fabricRef, activeTool, activeColor, activeSize, saveState, isPanningRef]);

  useEffect(() => {
    return applyTool();
  }, [applyTool]);
}