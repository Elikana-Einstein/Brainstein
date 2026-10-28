import * as fabric from "fabric";
import { buildShape, SHAPE_TYPES, nextId } from "./shapeFactory.js";

const DEFAULT_COLOR = "#3B82F6";
const CONNECTOR_COLOR = "#475569";
const TEXT_COLOR = "#1f2937";
const FONT = "DM Mono, monospace";
const GAP = 40;

const CREATABLE = SHAPE_TYPES.filter((t) => t !== "arrow" && t !== "line");
const DEFAULT_SIZE = {
  decision: [200, 110],
  database: [140, 100],
  document: [160, 90],
  connector: [50, 50],
};
// Fraction of a shape's box that is usable for text.
const TEXT_AREA = {
  decision: 0.55, inputOutput: 0.7, connector: 0.7, database: 0.7, document: 0.8,
};

/* ── geometry (works for any origin setting) ─────── */
const findById = (canvas, id) => canvas.getObjects().find((o) => o.id === id);
const centerOf = (o) => o.getCenterPoint();
const boxOf = (o) => {
  const c = o.getCenterPoint();
  const w = o.getScaledWidth();
  const h = o.getScaledHeight();
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
};

const tint = (color, alpha = 0.13) => {
  try {
    const c = new fabric.Color(color);
    c.setAlpha(alpha);
    return c.toRgba();
  } catch {
    return "rgba(255,255,255,0)";
  }
};

const visibleRect = (canvas) => {
  const vpt = canvas.viewportTransform;
  const z = canvas.getZoom();
  return { x: -vpt[4] / z, y: -vpt[5] / z, w: canvas.getWidth() / z, h: canvas.getHeight() / z };
};

const overlaps = (a, b, pad = 0) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x &&
  a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

function findFreeSpot(canvas, w, h) {
  const view = visibleRect(canvas);
  const others = canvas.getObjects().filter((o) => !o.labelOf && !o.fromId).map(boxOf);
  const start = { x: view.x + (view.w - w) / 2, y: view.y + (view.h - h) / 2 };
  const free = (p) => !others.some((b) => overlaps({ x: p.x, y: p.y, w, h }, b, GAP / 2));
  if (free(start)) return start;
  for (let y = view.y + GAP; y + h < view.y + view.h; y += GAP) {
    for (let x = view.x + GAP; x + w < view.x + view.w; x += GAP) {
      if (free({ x, y })) return { x, y };
    }
  }
  return start;
}

/* ── labels (wrapped and shrunk to fit the shape) ── */
function placeLabel(shape, lbl) {
  const c = centerOf(shape);
  lbl.set({ left: c.x, top: c.y });
  lbl.setCoords();
}

function fitLabel(shape, lbl) {
  const area = TEXT_AREA[shape.kind] ?? 0.85;
  const maxW = shape.getScaledWidth() * area;
  const maxH = shape.getScaledHeight() * area;
  let size = 16;
  lbl.set({ width: maxW, fontSize: size });
  lbl.initDimensions?.();
  while (lbl.height > maxH && size > 9) {
    size -= 1;
    lbl.set({ fontSize: size });
    lbl.initDimensions?.();
  }
  placeLabel(shape, lbl);
}

function makeLabel(shape, text) {
  const lbl = new fabric.Textbox(String(text), {
    originX: "center", originY: "center", textAlign: "center",
    fontFamily: FONT, fill: TEXT_COLOR,
    selectable: false, evented: false, objectCaching: false,
    id: nextId("t"), labelOf: shape.id,
  });
  fitLabel(shape, lbl);
  return lbl;
}

/* ── connectors (straight or elbow, attached to edges) ── */
function route(from, to) {
  const A = boxOf(from);
  const B = boxOf(to);
  const ca = { x: A.x + A.w / 2, y: A.y + A.h / 2 };
  const cb = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  const ALIGN = 12;

  if (Math.abs(dx) < ALIGN) {
    const down = dy > 0;
    const x = (ca.x + cb.x) / 2;
    return [{ x, y: down ? A.y + A.h : A.y }, { x, y: down ? B.y : B.y + B.h }];
  }
  if (Math.abs(dy) < ALIGN) {
    const right = dx > 0;
    const y = (ca.y + cb.y) / 2;
    return [{ x: right ? A.x + A.w : A.x, y }, { x: right ? B.x : B.x + B.w, y }];
  }
  if (Math.abs(dy) >= Math.abs(dx)) {
    const down = dy > 0;
    const y1 = down ? A.y + A.h : A.y;
    const y2 = down ? B.y : B.y + B.h;
    const midY = (y1 + y2) / 2;
    return [{ x: ca.x, y: y1 }, { x: ca.x, y: midY }, { x: cb.x, y: midY }, { x: cb.x, y: y2 }];
  }
  const right = dx > 0;
  const x1 = right ? A.x + A.w : A.x;
  const x2 = right ? B.x : B.x + B.w;
  const midX = (x1 + x2) / 2;
  return [{ x: x1, y: ca.y }, { x: midX, y: ca.y }, { x: midX, y: cb.y }, { x: x2, y: cb.y }];
}

const polyMid = (pts) => {
  const i = Math.floor((pts.length - 1) / 2);
  return { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
};

function makeConnector(points, { color, size, arrow }) {
  const parts = [
    new fabric.Polyline(points, {
      stroke: color, strokeWidth: size, fill: "",
      strokeLineJoin: "round", strokeLineCap: "round", objectCaching: false,
    }),
  ];
  if (arrow) {
    const p = points[points.length - 1];
    const q = points[points.length - 2];
    const ang = Math.atan2(p.y - q.y, p.x - q.x);
    const head = Math.max(10, size * 4);
    const wing = Math.PI / 7;
    parts.push(
      new fabric.Polygon(
        [
          p,
          { x: p.x - head * Math.cos(ang - wing), y: p.y - head * Math.sin(ang - wing) },
          { x: p.x - head * Math.cos(ang + wing), y: p.y - head * Math.sin(ang + wing) },
        ],
        { fill: color, stroke: color, strokeWidth: 1 }
      )
    );
  }
  return new fabric.Group(parts, {
    selectable: true, evented: true, objectCaching: false,
    hasControls: false, lockMovementX: true, lockMovementY: true,
  });
}

function drawConnection(canvas, from, to, { color, size, arrow = true, label, id, existingLabel }) {
  const pts = route(from, to);
  const conn = makeConnector(pts, { color, size, arrow });
  conn.set({
    id: id ?? nextId("c"),
    fromId: from.id, toId: to.id,
    kind: arrow ? "arrow" : "line",
  });
  canvas.add(conn);
  canvas.sendObjectToBack?.(conn);

  const mid = polyMid(pts);
  if (existingLabel) {
    existingLabel.set({ left: mid.x, top: mid.y });
    existingLabel.setCoords();
  } else if (label) {
    canvas.add(
      new fabric.IText(String(label), {
        left: mid.x, top: mid.y, originX: "center", originY: "center",
        fontSize: 14, fontFamily: FONT, fill: TEXT_COLOR,
        backgroundColor: "#ffffff", selectable: false, evented: false,
        id: nextId("t"), labelOf: conn.id,
      })
    );
  }
  return conn;
}

function redrawConnection(canvas, conn) {
  const from = findById(canvas, conn.fromId);
  const to = findById(canvas, conn.toId);
  if (!from || !to) return;
  const line = conn.item(0);
  const existingLabel = canvas.getObjects().find((o) => o.labelOf === conn.id);
  canvas.remove(conn);
  drawConnection(canvas, from, to, {
    color: line.stroke, size: line.strokeWidth,
    arrow: conn.kind !== "line", id: conn.id, existingLabel,
  });
}

/* Keep labels and connectors attached when shapes move or resize. */
function refreshLinks(canvas, moved, refit = false) {
  const shapes = moved.filter((o) => o.id && !o.fromId && !o.labelOf);
  if (!shapes.length) return;
  const ids = new Set(shapes.map((o) => o.id));

  shapes.forEach((s) => {
    const lbl = canvas.getObjects().find((o) => o.labelOf === s.id);
    if (lbl) (refit ? fitLabel : placeLabel)(s, lbl);
  });

  canvas
    .getObjects()
    .filter((o) => o.fromId && (ids.has(o.fromId) || ids.has(o.toId)))
    .forEach((conn) => redrawConnection(canvas, conn));

  canvas.requestRenderAll();
}

export function attachLinkSync(canvas) {
  const targetsOf = (t) => (t?.id ? [t] : t?.getObjects?.() ?? []);
  const onMoving = ({ target }) => refreshLinks(canvas, targetsOf(target));
  const onResize = ({ target }) => refreshLinks(canvas, target?.id ? [target] : [], true);

  canvas.on("object:moving", onMoving);
  canvas.on("object:scaling", onResize);
  canvas.on("object:modified", onResize);
  return () => {
    canvas.off("object:moving", onMoving);
    canvas.off("object:scaling", onResize);
    canvas.off("object:modified", onResize);
  };
}

/* ── misc helpers ────────────────────────────────── */
const lower = (o) => o.type?.toLowerCase();

const recolor = (o, color) => {
  if (o.fromId) {
    o.getObjects().forEach((c) =>
      c.set(lower(c) === "polygon" ? { stroke: color, fill: color } : { stroke: color })
    );
  } else if (o.getObjects) {
    o.getObjects().forEach((c) =>
      c.set(lower(c) === "rect" ? { stroke: color, fill: tint(color) } : { stroke: color })
    );
  } else {
    o.set({ stroke: color, fill: tint(color) });
  }
  o.set({ dirty: true });
};

const describe = (o) => {
  const b = boxOf(o);
  const first = o.getObjects ? o.getObjects()[0] : o;
  return {
    id: o.id ?? null,
    type: o.kind ?? o.type,
    ...(o.fromId && { from: o.fromId, to: o.toId }),
    ...(!o.labelOf && lower(o) === "itext" && { text: o.text }),
    x: Math.round(b.x), y: Math.round(b.y),
    width: Math.round(b.w), height: Math.round(b.h),
    color: first?.stroke || undefined,
  };
};

const removeWithAttachments = (canvas, obj) => {
  canvas.getObjects().forEach((o) => {
    if (o.labelOf === obj.id || o.fromId === obj.id || o.toId === obj.id) {
      removeWithAttachments(canvas, o);
    }
  });
  canvas.remove(obj);
};

/* ── main handler ────────────────────────────────── */
export const handleCanvasAction = (action, fabricRef, saveState, sendWS) => {
  const canvas = fabricRef.current;

  const respond = (success, result, error) => {
    if (typeof sendWS !== "function") return console.error("sendWS missing");
    sendWS({
      type: "canvas_action_result",
      callId: action.callId, name: action.name, success,
      ...(success ? { result } : { error }),
    });
  };
  const done = () => { canvas.requestRenderAll(); saveState?.(); };
  const need = (id) => {
    const o = findById(canvas, id);
    if (!o) throw new Error(`No object with id "${id}". Call get_canvas_state to see valid ids.`);
    return o;
  };

  try {
    if (!canvas) throw new Error("Canvas is not ready.");
    const a = action.args ?? {};

    switch (action.name) {
      case "get_canvas_state": {
        const objects = canvas.getObjects().filter((o) => !o.labelOf).map((o) => {
          const d = describe(o);
          const lbl = canvas.getObjects().find((l) => l.labelOf === o.id);
          return lbl ? { ...d, label: lbl.text } : d;
        });
        const v = visibleRect(canvas);
        respond(true, {
          visibleArea: { x: Math.round(v.x), y: Math.round(v.y), width: Math.round(v.w), height: Math.round(v.h) },
          objects,
        });
        break;
      }

      case "create_shape": {
        const { type, color = DEFAULT_COLOR, x, y, label, strokeWidth = 2 } = a;
        if (!CREATABLE.includes(type)) {
          throw new Error(`Unsupported shape type "${type}". Use one of: ${CREATABLE.join(", ")}. For lines and arrows use connect.`);
        }
        const [dw, dh] = DEFAULT_SIZE[type] ?? [160, 80];
        const textW = label
          ? Math.ceil((String(label).length * 9) / (TEXT_AREA[type] ?? 0.85)) + 24
          : 0;
        let w = a.width ?? Math.max(dw, Math.min(textW, 260));
        let h = a.height ?? dh;
        if (type === "connector") w = h = Math.min(w, h);

        const pos = x != null && y != null ? { x, y } : findFreeSpot(canvas, w, h);
        const shape = buildShape(type, pos.x, pos.y, pos.x + w, pos.y + h, {
          color, size: strokeWidth, fill: tint(color),
        });
        shape.set({ id: nextId(), kind: type });
        canvas.add(shape);
        if (label) canvas.add(makeLabel(shape, label));
        done();
        respond(true, describe(shape));
        break;
      }

      case "create_text": {
        const { text, x, y, color = TEXT_COLOR, fontSize = 18 } = a;
        if (!text) throw new Error("`text` is required.");
        const pos = x != null && y != null ? { x, y } : findFreeSpot(canvas, 200, fontSize * 1.5);
        const t = new fabric.IText(String(text), {
          left: pos.x, top: pos.y, originX: "left", originY: "top",
          fontSize, fill: color, fontFamily: FONT,
          id: nextId("t"), objectCaching: false,
        });
        canvas.add(t);
        done();
        respond(true, describe(t));
        break;
      }

      case "connect": {
        const { fromId, toId, label, color = CONNECTOR_COLOR, strokeWidth = 2, style = "arrow" } = a;
        const conn = drawConnection(canvas, need(fromId), need(toId), {
          color, size: strokeWidth, arrow: style !== "line", label,
        });
        done();
        respond(true, { id: conn.id, from: fromId, to: toId });
        break;
      }

      case "update_shape": {
        const o = need(a.id);
        if (a.color) recolor(o, a.color);
        if (a.width && !o.fromId) o.set({ scaleX: a.width / o.width });
        if (a.height && !o.fromId) o.set({ scaleY: a.height / o.height });
        o.setCoords();
        if (a.label != null && !o.fromId) {
          const old = canvas.getObjects().find((l) => l.labelOf === o.id);
          if (old) old.set({ text: String(a.label) });
          else canvas.add(makeLabel(o, a.label));
        }
        refreshLinks(canvas, [o], true);
        done();
        respond(true, describe(o));
        break;
      }

      case "move_shape": {
        const o = need(a.id);
        if (o.fromId) throw new Error("Connectors follow their shapes; move the shapes instead.");
        const b = boxOf(o);
        o.setPositionByOrigin(new fabric.Point(a.x ?? b.x, a.y ?? b.y), "left", "top");
        o.setCoords();
        refreshLinks(canvas, [o]);
        done();
        respond(true, describe(o));
        break;
      }

      case "delete_shape": {
        removeWithAttachments(canvas, need(a.id));
        done();
        respond(true, `Deleted ${a.id}.`);
        break;
      }

      case "delete_selected": {
        const sel = canvas.getActiveObjects();
        if (!sel.length) return respond(true, "No objects were selected.");
        sel.forEach((o) => (o.id ? removeWithAttachments(canvas, o) : canvas.remove(o)));
        canvas.discardActiveObject();
        done();
        respond(true, `${sel.length} object(s) deleted.`);
        break;
      }

      default:
        throw new Error(`Unknown canvas action: ${action.name}`);
    }
  } catch (error) {
    respond(false, undefined, error.message || "Canvas action failed.");
  }
};