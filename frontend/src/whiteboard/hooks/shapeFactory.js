import * as fabric from "fabric";

export const SHAPE_TYPES = [
  "rect", "circle", "line", "terminator", "decision", "inputOutput",
  "document", "database", "predefinedProcess", "manualInput",
  "connector", "arrow",
];

// Lets ids/links survive saveState / JSON serialization (Fabric v6+).
fabric.FabricObject.customProperties = [
  ...new Set([
    ...(fabric.FabricObject.customProperties || []),
    "id", "kind", "labelOf", "fromId", "toId",
  ]),
];

let counter = 0;
export const nextId = (prefix = "n") => `${prefix}${++counter}`;

export const ensureId = (obj) => {
  if (obj && !obj.id) obj.set("id", nextId());
  return obj;
};

// Call after loading a saved slide so new ids never collide with old ones.
export const syncIdCounter = (canvas) => {
  canvas.getObjects().forEach((o) => {
    const m = /(\d+)$/.exec(o.id ?? "");
    if (m) counter = Math.max(counter, Number(m[1]));
  });
};

/**
 * Build a shape from a bounding box (x1,y1)-(x2,y2).
 * Origin is forced to top-left so `left`/`top` mean the same thing
 * in every Fabric version (v7 defaults to center origin).
 */
export function buildShape(
  tool, x1, y1, x2, y2,
  { color, size, fill = "rgba(255,255,255,0)" }
) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(Math.abs(x2 - x1), 1);
  const height = Math.max(Math.abs(y2 - y1), 1);
  const origin = { originX: "left", originY: "top" };
  const options = {
    ...origin,
    stroke: color,
    strokeWidth: size,
    strokeUniform: true,
    fill,
    selectable: true,
    evented: true,
    objectCaching: false,
  };
  const groupOptions = {
    ...origin, left, top, selectable: true, evented: true, objectCaching: false,
  };

  switch (tool) {
    case "rect":
      return new fabric.Rect({ ...options, left, top, width, height });
    case "circle":
      return new fabric.Ellipse({ ...options, left, top, rx: width / 2, ry: height / 2 });
    case "line":
      return new fabric.Line([x1, y1, x2, y2], { ...options, fill: "" });
    case "terminator":
      return new fabric.Rect({ ...options, left, top, width, height, rx: height / 2, ry: height / 2 });
    case "decision":
      return new fabric.Polygon(
        [{ x: width / 2, y: 0 }, { x: width, y: height / 2 }, { x: width / 2, y: height }, { x: 0, y: height / 2 }],
        { ...options, left, top }
      );
    case "inputOutput":
      return new fabric.Polygon(
        [{ x: width * 0.22, y: 0 }, { x: width, y: 0 }, { x: width * 0.78, y: height }, { x: 0, y: height }],
        { ...options, left, top }
      );
    case "document":
      return new fabric.Path(
        `M 0 0 L ${width} 0 L ${width} ${height * 0.82}
         Q ${width * 0.75} ${height * 1.08} ${width * 0.5} ${height * 0.91}
         Q ${width * 0.25} ${height * 0.74} 0 ${height} Z`,
        { ...options, left, top }
      );
    case "database":
      return new fabric.Path(
        `M 0 ${height * 0.14}
         C 0 ${-height * 0.04}, ${width} ${-height * 0.04}, ${width} ${height * 0.14}
         L ${width} ${height * 0.86}
         C ${width} ${height * 1.04}, 0 ${height * 1.04}, 0 ${height * 0.86} Z
         M 0 ${height * 0.14}
         C 0 ${height * 0.38}, ${width} ${height * 0.38}, ${width} ${height * 0.14}`,
        { ...options, left, top }
      );
    case "predefinedProcess": {
      const s = { stroke: options.stroke, strokeWidth: options.strokeWidth };
      return new fabric.Group(
        [
          new fabric.Rect({ width, height, fill: options.fill, ...s }),
          new fabric.Line([width * 0.18, 0, width * 0.18, height], s),
          new fabric.Line([width * 0.82, 0, width * 0.82, height], s),
        ],
        groupOptions
      );
    }
    case "manualInput":
      return new fabric.Polygon(
        [{ x: width * 0.18, y: 0 }, { x: width, y: height * 0.22 }, { x: width, y: height }, { x: 0, y: height }],
        { ...options, left, top }
      );
    case "connector": {
      const r = Math.min(width, height) / 2;
      return new fabric.Circle({ ...options, left, top, radius: r });
    }
    case "arrow": {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = Math.min(18, Math.max(10, size * 4));
      const wing = Math.PI / 7;
      const tip = { x: x2, y: y2 };
      const p2 = { x: x2 - head * Math.cos(angle - wing), y: y2 - head * Math.sin(angle - wing) };
      const p3 = { x: x2 - head * Math.cos(angle + wing), y: y2 - head * Math.sin(angle + wing) };
      return new fabric.Group(
        [
          new fabric.Line([x1, y1, x2, y2], { stroke: color, strokeWidth: size, strokeLineCap: "round" }),
          new fabric.Polygon([tip, p2, p3], { fill: color, stroke: color, strokeWidth: 1 }),
        ],
        groupOptions
      );
    }
    default:
      return null;
  }
}