
export const WHITEBOARD_PALETTE = [
  "#0f0e0d",
  "#e63946",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

export const STROKE_SIZES = [2, 5, 10, 18];

export const WHITEBOARD_TOOLS = [
  { id: "pen", label: "Pen" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "line", label: "Line" },
  { id: "select", label: "select" },
];

export const TOOL_HINTS = {
  pen: "Draw freely on the canvas",
  rect: "Click and drag to draw a rectangle",
  circle: "Click and drag to draw a circle",
  line: "Click and drag to draw a line",
  text: "Click anywhere to place text",
  eraser: "Click and drag to erase",
  select: "Click and select to manipulate",
};

export const DEFAULT_CANVAS_SIZE = {
  width: 800,
  height: 700,
};

export const CANVAS_SIZE_LIMITS = {
  minHeight: 360,
  maxHeight: 700,
  viewportHeightRatio: 0.8,
};
