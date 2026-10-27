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

    const isSelectTool = activeTool === "select";

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

    // PEN TOOL
    if (activeTool === "pen") {
      const brush = new fabric.PencilBrush(canvas);
      brush.color = activeColor;
      brush.width = activeSize;
      brush.strokeLineCap = "round";
      brush.strokeLineJoin = "round";

      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
    }

    // ERASER TOOL
    if (activeTool === "eraser") {
      const isPenStroke = (object) =>
        object?.type === "path";

      canvas.getObjects().forEach((object) => {
        object.set("erasable", isPenStroke(object));
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

      const disposeEraserEnd = eraser.on(
        "end",
        onEraseEnd
      );

      handlers.push([
        "eraser:cleanup",
        () => {
          if (typeof disposeEraserEnd === "function") {
            disposeEraserEnd();
          }
        },
      ]);

      canvas.freeDrawingBrush = eraser;
      canvas.isDrawingMode = true;
      canvas.defaultCursor = "cell";
      canvas.selection = false;
    }

    // DOUBLE-CLICK TO EDIT EXISTING TEXT
    if (isSelectTool) {
      const onDoubleClick = (event) => {
        const target = event.target;

        if (
          target &&
          target.isType("i-text", "text", "textbox")
        ) {
          canvas.setActiveObject(target);
          target.enterEditing();
          canvas.requestRenderAll();
        }
      };

      on("mouse:dblclick", onDoubleClick);
    }

        const shapeTools = [
      "rect",
      "circle",
      "line",
      "terminator",
      "decision",
      "inputOutput",
      "document",
      "database",
      "predefinedProcess",
      "manualInput",
      "connector",
      "arrow",
    ];

    const getShapeOptions = () => ({
      stroke: activeColor,
      strokeWidth: activeSize,
      strokeUniform: true,
      fill: "rgba(255,255,255,0)",
      selectable: true,
      evented: true,
      objectCaching: false,
    });

    const createShape = (tool, x1, y1, x2, y2) => {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.max(Math.abs(x2 - x1), 1);
      const height = Math.max(Math.abs(y2 - y1), 1);
      const options = getShapeOptions();

      switch (tool) {
        // BASIC RECTANGLE
        case "rect":
          return new fabric.Rect({
            ...options,
            left,
            top,
            width,
            height,
          });

        // BASIC ELLIPSE
        case "circle":
          return new fabric.Ellipse({
            ...options,
            left,
            top,
            rx: width / 2,
            ry: height / 2,
          });

        // BASIC LINE
        case "line":
          return new fabric.Line(
            [x1, y1, x2, y2],
            {
              ...options,
              fill: "",
            }
          );

        // FLOWCHART: START / END
        case "terminator":
          return new fabric.Rect({
            ...options,
            left,
            top,
            width,
            height,
            rx: height / 2,
            ry: height / 2,
          });

        // FLOWCHART: DECISION DIAMOND
        case "decision":
          return new fabric.Polygon(
            [
              { x: width / 2, y: 0 },
              { x: width, y: height / 2 },
              { x: width / 2, y: height },
              { x: 0, y: height / 2 },
            ],
            {
              ...options,
              left,
              top,
            }
          );

        // FLOWCHART: INPUT / OUTPUT
        case "inputOutput":
          return new fabric.Polygon(
            [
              { x: width * 0.22, y: 0 },
              { x: width, y: 0 },
              { x: width * 0.78, y: height },
              { x: 0, y: height },
            ],
            {
              ...options,
              left,
              top,
            }
          );

        // FLOWCHART: DOCUMENT
        case "document":
          return new fabric.Path(
            `M 0 0
             L ${width} 0
             L ${width} ${height * 0.82}
             Q ${width * 0.75} ${height * 1.08}
               ${width * 0.5} ${height * 0.91}
             Q ${width * 0.25} ${height * 0.74}
               0 ${height}
             Z`,
            {
              ...options,
              left,
              top,
            }
          );

        // FLOWCHART: DATABASE
        case "database":
          return new fabric.Path(
            `M 0 ${height * 0.14}
             C 0 ${-height * 0.04},
               ${width} ${-height * 0.04},
               ${width} ${height * 0.14}
             L ${width} ${height * 0.86}
             C ${width} ${height * 1.04},
               0 ${height * 1.04},
               0 ${height * 0.86}
             Z
             M 0 ${height * 0.14}
             C 0 ${height * 0.38},
               ${width} ${height * 0.38},
               ${width} ${height * 0.14}`,
            {
              ...options,
              left,
              top,
            }
          );

        // FLOWCHART: PREDEFINED PROCESS
        case "predefinedProcess":
          return new fabric.Group(
            [
              new fabric.Rect({
                width,
                height,
                fill: options.fill,
                stroke: options.stroke,
                strokeWidth: options.strokeWidth,
              }),
              new fabric.Line([
                width * 0.18, 0,
                width * 0.18, height,
              ], {
                stroke: options.stroke,
                strokeWidth: options.strokeWidth,
              }),
              new fabric.Line([
                width * 0.82, 0,
                width * 0.82, height,
              ], {
                stroke: options.stroke,
                strokeWidth: options.strokeWidth,
              }),
            ],
            {
              left,
              top,
              selectable: true,
              evented: true,
              objectCaching: false,
            }
          );

        // FLOWCHART: MANUAL INPUT
        case "manualInput":
          return new fabric.Polygon(
            [
              { x: width * 0.18, y: 0 },
              { x: width, y: height * 0.22 },
              { x: width, y: height },
              { x: 0, y: height },
            ],
            {
              ...options,
              left,
              top,
            }
          );

        // FLOWCHART: CONNECTOR CIRCLE
        case "connector":
          return new fabric.Circle({
            ...options,
            left,
            top,
            radius: Math.min(width, height) / 2,
          });

        // FLOWCHART: ARROW
        case "arrow": {
          const angle = Math.atan2(
            y2 - y1,
            x2 - x1
          );

          const headLength = Math.min(
            18,
            Math.max(10, activeSize * 4)
          );

          const wingAngle = Math.PI / 7;

          const tip = { x: x2, y: y2 };

          const point2 = {
            x: x2 - headLength * Math.cos(
              angle - wingAngle
            ),
            y: y2 - headLength * Math.sin(
              angle - wingAngle
            ),
          };

          const point3 = {
            x: x2 - headLength * Math.cos(
              angle + wingAngle
            ),
            y: y2 - headLength * Math.sin(
              angle + wingAngle
            ),
          };

          return new fabric.Group(
            [
              new fabric.Line(
                [x1, y1, x2, y2],
                {
                  stroke: activeColor,
                  strokeWidth: activeSize,
                  strokeLineCap: "round",
                }
              ),
              new fabric.Polygon(
                [tip, point2, point3],
                {
                  fill: activeColor,
                  stroke: activeColor,
                  strokeWidth: 1,
                }
              ),
            ],
            {
              left,
              top,
              selectable: true,
              evented: true,
              objectCaching: false,
            }
          );
        }

        default:
          return null;
      }
    };

        if (shapeTools.includes(activeTool)) {
      const onMouseDown = (event) => {
        // Don't draw while Space-drag panning is active.
        if (isPanningRef?.current) return;

        if (
          event.e?.button !== undefined &&
          event.e.button !== 0
        ) {
          return;
        }

        const point = event.scenePoint;
        if (!point) return;

        isDrawingShape = true;
        startX = point.x;
        startY = point.y;

        currentShape = createShape(
          activeTool,
          startX,
          startY,
          startX + 1,
          startY + 1
        );

        if (currentShape) {
          canvas.add(currentShape);
          canvas.requestRenderAll();
        }
      };

      const onMouseMove = (event) => {
        if (
          !isDrawingShape ||
          !currentShape ||
          isPanningRef?.current
        ) {
          return;
        }

        const point = event.scenePoint;
        if (!point) return;

        const nextShape = createShape(
          activeTool,
          startX,
          startY,
          point.x,
          point.y
        );

        if (!nextShape) return;

        canvas.remove(currentShape);
        currentShape = nextShape;
        canvas.add(currentShape);
        canvas.requestRenderAll();
      };

      const onMouseUp = () => {
        if (!isDrawingShape) return;

        stopDrawing();
        saveState?.();
      };

      on("mouse:down", onMouseDown);
      on("mouse:move", onMouseMove);
      on("mouse:up", onMouseUp);
    }

    // TEXT TOOL
    if (activeTool === "text") {
      const onMouseDown = (event) => {
        if (isPanningRef?.current) return;

        const point = event.scenePoint;
        if (!point) return;

        // Don't create a new text object over existing text.
        if (
          event.target?.isType?.(
            "i-text",
            "text",
            "textbox"
          )
        ) {
          return;
        }

        const text = new fabric.IText("", {
          left: point.x,
          top: point.y,
          fontSize: Math.max(
            activeSize * 3 + 12,
            18
          ),
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
  }, [
    fabricRef,
    activeTool,
    activeColor,
    activeSize,
    saveState,
    isPanningRef,
  ]);

  useEffect(() => {
    return applyTool();
  }, [applyTool]);
}