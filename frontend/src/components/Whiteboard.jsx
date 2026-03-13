import React, { useRef, useEffect, useState, useCallback } from 'react';
import useFabricCanvas from '../pages/FabricCanvas';
import useStore from '../zustand/store';
import * as fabric from 'fabric';

/* ─── Inject Google Fonts once ─────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('wb-fonts')) {
  const link = document.createElement('link');
  link.id = 'wb-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
}

/* ─── Palette & sizes ──────────────────────────────── */
const PALETTE = [
  '#0f0e0d', '#e63946', '#2563eb', '#16a34a',
  '#d97706', '#7c3aed', '#0891b2', '#db2777',
];
const STROKE_SIZES = [2, 5, 10, 18];

/* ─── Tool definitions ─────────────────────────────── */
const TOOLS = [
  { id: 'pen',    label: 'Pen',       icon: PenSVG    },
  { id: 'rect',   label: 'Rectangle', icon: RectSVG   },
  { id: 'circle', label: 'Circle',    icon: CircleSVG },
  { id: 'line',   label: 'Line',      icon: LineSVG   },
  { id: 'text',   label: 'Text',      icon: TextSVG   },
  { id: 'eraser', label: 'Eraser',    icon: EraserSVG },
];

/* ─── SVG Icons ─────────────────────────────────────── */
function PenSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16l2-6L14 2l4 4L10 14 4 16z" /><path d="M14 6l-4 4" />
    </svg>
  );
}
function RectSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2.5" />
    </svg>
  );
}
function CircleSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="10" r="7" />
    </svg>
  );
}
function LineSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="17" x2="17" y2="3" />
    </svg>
  );
}
function TextSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4.5h14v2H11.5v9h-3v-9H3v-2z" />
    </svg>
  );
}
function EraserSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l3.5-3.5L14.5 5l3 3-8 8L7 17H3z" />
      <path d="M11.5 6.5l2 2" />
    </svg>
  );
}
function TrashSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 17 6" /><path d="M8 6V4h4v2" />
      <path d="M5 6l1 11h8l1-11" />
    </svg>
  );
}
function DownloadSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10M6 9l4 4 4-4" /><path d="M4 16h12" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const Whiteboard = () => {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const [dims, setDims]               = useState({ width: 800, height: 520 });
  const [activeTool, setActiveTool]   = useState('pen');
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [activeSize, setActiveSize]   = useState(STROKE_SIZES[1]);
  const [isMounted, setIsMounted]     = useState(false);
  const { setColor, setWidth ,name,getSlides,currentCanvasId,updateSlide} = useStore();

  /* ── Responsive canvas sizing via ResizeObserver ── */
  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = Math.max(360, Math.min(window.innerHeight * 0.65, 700));
      setDims({ width: w, height: h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(()=>{
    getSlides()
  },[currentCanvasId])
  /* ── Init Fabric hook ───────────────────────────── */
  const { fabricRef, clearCanvas, saveCanvas } = useFabricCanvas(canvasRef, {
    width: dims.width,
    height: dims.height,
    brushColor: activeColor,
    brushWidth: activeSize,
  });

  useEffect(() => { setIsMounted(true); }, []);

  /* ── Keep canvas dimensions in sync (Fabric v6) ─── */
  useEffect(() => {
    const c = fabricRef?.current;
    if (!c) return;
    c.set({ width: dims.width, height: dims.height });
    c.setDimensions({ width: dims.width, height: dims.height });
    c.renderAll();
  }, [dims]);

  /* ── Apply tool logic to Fabric canvas ─────────── */
  const applyTool = useCallback((tool, color, size) => {
    const c = fabricRef?.current;
    if (!c) return;

    // Reset state
    c.isDrawingMode = false;
    c.off('mouse:down');
    c.off('mouse:move');
    c.off('mouse:up');
    c.defaultCursor = 'crosshair';
    c.selection = true;

    if (tool === 'pen') {
      c.isDrawingMode = true;
      c.freeDrawingBrush = new fabric.PencilBrush(c);
      c.freeDrawingBrush.color = color;
      c.freeDrawingBrush.width = size;

    } else if (tool === 'eraser') {
      c.isDrawingMode = true;
      const brush = new fabric.PencilBrush(c);
      brush.color = '#ffffff';
      brush.width = size * 4;
      c.freeDrawingBrush = brush;
      c.defaultCursor = 'cell';

    } else if (tool === 'rect') {
      c.selection = false;
      let startX, startY, rect, isDown = false;
      c.on('mouse:down', (opt) => {
        isDown = true;
        const ptr = opt.scenePoint;
        startX = ptr.x; startY = ptr.y;
        rect = new fabric.Rect({
          left: startX, top: startY, width: 1, height: 1,
          fill: 'transparent', stroke: color, strokeWidth: size,
          selectable: false, evented: false,
        });
        c.add(rect);
        c.renderAll();
      });
      c.on('mouse:move', (opt) => {
        if (!isDown || !rect) return;
        const ptr = opt.scenePoint;
        const w = ptr.x - startX, h = ptr.y - startY;
        rect.set({
          width: Math.abs(w), height: Math.abs(h),
          left: w < 0 ? ptr.x : startX,
          top:  h < 0 ? ptr.y : startY,
        });
        c.renderAll();
      });
      c.on('mouse:up', () => { isDown = false; rect = null; });

    } else if (tool === 'circle') {
      c.selection = false;
      let startX, startY, ellipse, isDown = false;
      c.on('mouse:down', (opt) => {
        isDown = true;
        const ptr = opt.scenePoint;
        startX = ptr.x; startY = ptr.y;
        ellipse = new fabric.Ellipse({
          left: startX, top: startY, rx: 1, ry: 1,
          fill: 'transparent', stroke: color, strokeWidth: size,
          selectable: false, evented: false,
        });
        c.add(ellipse);
        c.renderAll();
      });
      c.on('mouse:move', (opt) => {
        if (!isDown || !ellipse) return;
        const ptr = opt.scenePoint;
        const rx = Math.abs(ptr.x - startX) / 2;
        const ry = Math.abs(ptr.y - startY) / 2;
        ellipse.set({
          rx: Math.max(rx, 1), ry: Math.max(ry, 1),
          left: Math.min(ptr.x, startX),
          top:  Math.min(ptr.y, startY),
        });
        c.renderAll();
      });
      c.on('mouse:up', () => { isDown = false; ellipse = null; });

    } else if (tool === 'line') {
      c.selection = false;
      let line, isDown = false;
      c.on('mouse:down', (opt) => {
        isDown = true;
        const ptr = opt.scenePoint;
        line = new fabric.Line([ptr.x, ptr.y, ptr.x, ptr.y], {
          stroke: color, strokeWidth: size, strokeLineCap: 'round',
          selectable: false, evented: false,
        });
        c.add(line);
        c.renderAll();
      });
      c.on('mouse:move', (opt) => {
        if (!isDown || !line) return;
        const ptr = opt.scenePoint;
        line.set({ x2: ptr.x, y2: ptr.y });
        c.renderAll();
      });
      c.on('mouse:up', () => { isDown = false; line = null; });

    } else if (tool === 'text') {
      c.selection = false;
      c.defaultCursor = 'text';
      c.on('mouse:down', (opt) => {
        const ptr = opt.scenePoint;
        const itext = new fabric.IText('Type here…', {
          left: ptr.x, top: ptr.y,
          fontSize: Math.max(size * 3 + 12, 18),
          fill: color,
          fontFamily: 'DM Mono, monospace',
          selectable: true,
          editable: true,
        });
        c.add(itext);
        c.setActiveObject(itext);
        itext.enterEditing();
        itext.selectAll();
        c.renderAll();
      });
    }
  }, [fabricRef]);

  /* ── Re-apply whenever tool / color / size changes */
  useEffect(() => {
    if (isMounted) applyTool(activeTool, activeColor, activeSize);
  }, [activeTool, activeColor, activeSize, isMounted]);

  const handleColor = (c) => { setActiveColor(c); setColor?.(c); };
  const handleSize  = (s) => { setActiveSize(s);  setWidth?.(s); };
  const hintText = {
    pen:    'Draw freely on the canvas',
    rect:   'Click & drag to draw a rectangle',
    circle: 'Click & drag to draw a circle',
    line:   'Click & drag to draw a line',
    text:   'Click anywhere to place text',
    eraser: 'Click & drag to erase',
  }[activeTool];

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <div style={S.page}>

      {/* Page heading */}
      <div style={S.heading}>
        <div style={S.brandRow}>
          <span style={S.brandDot} />
          <span style={S.brandName}>Brainstein</span>
          <span style={S.brandSlash}>/</span>
          <span className='text-red-700'>{name}</span>
          <span style={S.brandSub}>Workspace</span>
        </div>
      </div>

      {/* Card */}
      <div style={S.card}>

        {/* ══ TOOLBAR ══ */}
        <div style={S.toolbar}>

          {/* Tools */}
          <div style={S.group}>
            {TOOLS.map(({ id, label, icon: Icon }) => {
              const active = activeTool === id;
              return (
                <ToolButton key={id} active={active} title={label} onClick={() => setActiveTool(id)}>
                  <Icon /><span style={S.tlabel}>{label}</span>
                </ToolButton>
              );
            })}
          </div>

          <Divider />

          {/* Palette */}
          <div style={S.group}>
            {PALETTE.map(hex => (
              <button
                key={hex}
                title={hex}
                onClick={() => handleColor(hex)}
                style={{
                  ...S.swatch,
                  background: hex,
                  outline: activeColor === hex ? '2.5px solid #fff' : '2.5px solid transparent',
                  outlineOffset: '2px',
                  transform: activeColor === hex ? 'scale(1.22)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <Divider />

          {/* Stroke sizes */}
          <div style={S.group}>
            {STROKE_SIZES.map(s => {
              const active = activeSize === s;
              const px = Math.min(s * 1.5 + 4, 22);
              return (
                <button
                  key={s}
                  title={`${s}px`}
                  onClick={() => handleSize(s)}
                  style={{ ...S.sizeBtn, ...(active ? S.sizeBtnOn : {}) }}
                >
                  <span style={{
                    display: 'block', borderRadius: '50%',
                    width: px, height: px,
                    background: active ? '#fff' : activeColor,
                    transition: 'background .2s',
                  }} />
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div style={S.group}>
            <ActionBtn danger onClick={clearCanvas}>
              <TrashSVG />
            </ActionBtn>
            <ActionBtn primary onClick={saveCanvas}>
             {updateSlide?<span> Update </span>:<span> save</span>}
            </ActionBtn>
          </div>
        </div>

        {/* ══ CANVAS ══ */}
        <div ref={wrapRef} style={S.canvasWrap}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          <span style={S.hint}>{hintText}</span>
        </div>

        {/* ══ STATUS BAR ══ */}
        <div style={S.statusBar}>
          <span style={S.chip}>
            <span style={{ ...S.chipDot, background: activeColor, boxShadow: `0 0 7px ${activeColor}` }} />
            {TOOLS.find(t => t.id === activeTool)?.label}
          </span>
          <span style={S.dimText}>{dims.width} × {dims.height}px</span>
        </div>

      </div>
    </div>
  );
};

/* ─── Sub-components ────────────────────────────────── */
function Divider() {
  return <span style={{ width: 1, height: 28, background: '#1e1e2e', flexShrink: 0, margin: '0 4px' }} />;
}

function ToolButton({ active, children, onClick, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.toolBtn,
        ...(active   ? S.toolBtnOn  : {}),
        ...(!active && hovered ? S.toolBtnHov : {}),
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ danger, primary, children, onClick }) {
  const [hov, setHov] = useState(false);
  let base = S.actBtn;
  if (primary) base = hov ? S.actBtnPriHov : S.actBtnPri;
  else if (danger && hov) base = { ...S.actBtn, ...S.actBtnDangerHov };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={base}
    >
      {children}
    </button>
  );
}

/* ─── Style map ─────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#0c0c14 0%,#10101e 60%,#09090f 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    padding: '24px 20px 32px',
    fontFamily: "'Syne', sans-serif",
    boxSizing: 'border-box',
  },
  heading: { marginBottom: 18, paddingLeft: 2 },
  brandRow: { display: 'flex', alignItems: 'center', gap: 8 },
  brandDot: {
    display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
    background: '#6366f1', boxShadow: '0 0 14px #6366f1bb',
  },
  brandName: { color: '#e8e6ff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' },
  brandSlash: { color: '#2e2e48', fontSize: 20, fontWeight: 300 },
  brandSub: { color: '#4b4b6a', fontSize: 13, fontFamily: "'DM Mono',monospace", letterSpacing: '0.4px' },

  card: {
    background: '#14141e',
    border: '1px solid #20202e',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.025)',
    display: 'flex', flexDirection: 'column',
  },

  toolbar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    gap: 5, padding: '9px 14px',
    background: '#0f0f1a',
    borderBottom: '1px solid #1a1a28',
    minHeight: 54,
  },
  group: { display: 'flex', alignItems: 'center', gap: 3 },

  toolBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent', color: '#50506e',
    cursor: 'pointer', fontSize: 12,
    fontFamily: "'Syne',sans-serif", fontWeight: 500,
    transition: 'all .15s', whiteSpace: 'nowrap',
  },
  toolBtnHov: { background: '#1c1c2c', color: '#a0a0c0', border: '1px solid #282838' },
  toolBtnOn:  { background: '#1c1c38', color: '#a5b4fc', border: '1px solid #4f46e5', boxShadow: '0 0 12px rgba(99,102,241,.2)' },
  tlabel: { fontSize: 11.5 },

  swatch: {
    width: 20, height: 20, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    transition: 'transform .15s, outline .15s', flexShrink: 0,
  },

  sizeBtn: {
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid transparent', background: 'transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .15s',
  },
  sizeBtnOn: { background: '#1c1c38', border: '1px solid #4f46e5' },

  actBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 13px', borderRadius: 8,
    border: '1px solid #222232', background: 'transparent',
    color: '#60607a', cursor: 'pointer', fontSize: 12,
    fontFamily: "'Syne',sans-serif", fontWeight: 600,
    transition: 'all .15s', whiteSpace: 'nowrap',
  },
  actBtnDangerHov: { background: '#27101a', border: '1px solid #7f1d1d', color: '#fca5a5' },
  actBtnPri: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #4f46e5',
    background: 'linear-gradient(135deg,#4338ca,#6366f1)',
    color: '#fff', cursor: 'pointer', fontSize: 12,
    fontFamily: "'Syne',sans-serif", fontWeight: 600,
    boxShadow: '0 0 16px rgba(99,102,241,.3)',
    transition: 'all .15s', whiteSpace: 'nowrap',
  },
  actBtnPriHov: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #6366f1',
    background: 'linear-gradient(135deg,#4f46e5,#818cf8)',
    color: '#fff', cursor: 'pointer', fontSize: 12,
    fontFamily: "'Syne',sans-serif", fontWeight: 600,
    boxShadow: '0 0 24px rgba(99,102,241,.45)',
    transition: 'all .15s', whiteSpace: 'nowrap',
  },

  canvasWrap: {
    width: '100%', position: 'relative',
    background: '#fff', lineHeight: 0, cursor: 'crosshair',
  },
  hint: {
    position: 'absolute', bottom: 12, right: 14,
    color: 'rgba(0,0,0,.18)', fontSize: 11,
    fontFamily: "'DM Mono',monospace",
    pointerEvents: 'none', userSelect: 'none',
  },

  statusBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 16px',
    background: '#0b0b14', borderTop: '1px solid #181824',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 7,
    color: '#48486a', fontSize: 11, fontFamily: "'DM Mono',monospace",
  },
  chipDot: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  dimText: { color: '#28283e', fontSize: 11, fontFamily: "'DM Mono',monospace" },
};

export default Whiteboard;