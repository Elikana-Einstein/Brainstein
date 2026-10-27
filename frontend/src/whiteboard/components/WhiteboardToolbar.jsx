import React, { useState } from "react";
import {
  WHITEBOARD_PALETTE,
  STROKE_SIZES,
  WHITEBOARD_TOOLS,
} from "../hooks/whiteboard.constants.js";
import { FlowShapeIcon } from "../hooks/toolHelper.jsx";

// Tool icons
function PenSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M4 16l2-6L14 2l4 4L10 14 4 16z" />
      <path d="M14 6l-4 4" />
    </svg>
  );
}

function RectSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2.5" />
    </svg>
  );
}

function CircleSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="10" r="7" />
    </svg>
  );
}

function LineSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="17" x2="17" y2="3" />
    </svg>
  );
}


function TrashSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round">
      <polyline points="3 6 17 6" />
      <path d="M8 6V4h4v2" />
      <path d="M5 6l1 11h8l1-11" />
    </svg>
  );
}

function MousePointer2() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2l11 7-5 1.5L8 16z" />
    </svg>
  );
}

function MoreShapesSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
      <path d="M13 2.5h4.5V7H13z" />
      <circle cx="5.5" cy="14.5" r="3" />
      <path d="M13 12h4.5M15.25 9.75v4.5" />
    </svg>
  );
}

const TOOL_ICONS = {
  pen: PenSVG,
  rect: RectSVG,
  circle: CircleSVG,
  line: LineSVG,
  select: MousePointer2,
};

// These IDs must match the IDs handled in useWhiteboardTools.js.
const MORE_SHAPES = [
  { id: "terminator", label: "Terminator" },
  { id: "decision", label: "Decision" },
  { id: "inputOutput", label: "Input / Output" },
  { id: "document", label: "Document" },
  { id: "database", label: "Database" },
  { id: "predefinedProcess", label: "Predefined Process" },
  { id: "manualInput", label: "Manual Input" },
  { id: "connector", label: "Connector" },
  { id: "arrow", label: "Arrow" },
  { id: "eraser", label: "Eraser" },
  { id: "text", label: "Text" },
];

export default function WhiteboardToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  activeSize,
  onSizeChange,
  onClear,
  onSave,
  isUpdating,
  S,
}) {
  return (
    <div style={S.toolbar}>
      {/* Drawing tools */}
      <div style={S.group}>
        {WHITEBOARD_TOOLS.map(({ id, label }) => {
          const Icon = TOOL_ICONS[id];

          return (
            <ToolButton
              key={id}
              active={activeTool === id}
              title={label}
              onClick={() => onToolChange(id)}
              S={S}
            >
              {Icon && <Icon />}
              <span style={S.tlabel}>{label}</span>
            </ToolButton>
          );
        })}

        <MoreShapesDropdown
          activeTool={activeTool}
          onToolChange={onToolChange}
          S={S}
        />
      </div>

      <Divider />

      {/* Color palette */}
      <div style={S.group}>
        {WHITEBOARD_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            aria-label={`Choose color ${hex}`}
            aria-pressed={activeColor === hex}
            onClick={() => onColorChange(hex)}
            style={{
              ...S.swatch,
              background: hex,
              outline:
                activeColor === hex
                  ? "2.5px solid #fff"
                  : "2.5px solid transparent",
              outlineOffset: "2px",
              transform: activeColor === hex ? "scale(1.22)" : "scale(1)",
              margin: activeColor === hex ? "2px 4px" : "",
            }}
          />
        ))}
      </div>

      <Divider />

      {/* Stroke sizes */}
      <div style={S.group}>
        {STROKE_SIZES.map((size) => {
          const active = activeSize === size;
          const px = Math.min(size * 1.5 + 4, 22);

          return (
            <button
              key={size}
              type="button"
              title={`${size}px`}
              aria-label={`Set stroke size to ${size}px`}
              aria-pressed={active}
              onClick={() => onSizeChange(size)}
              style={{
                ...S.sizeBtn,
                ...(active ? S.sizeBtnOn : {}),
              }}
            >
              <span
                style={{
                  display: "block",
                  borderRadius: "50%",
                  width: px,
                  height: px,
                  border: "1px solid white",
                  background: active ? "#fff" : activeColor,
                  transition: "background .2s",
                }}
              />
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Canvas actions */}
      <div style={S.group}>
        <ActionBtn danger onClick={onClear} S={S}>
          <TrashSVG />
        </ActionBtn>

        <ActionBtn primary onClick={onSave} S={S}>
          {isUpdating ? "Update" : "Save"}
        </ActionBtn>
      </div>
    </div>
  );
}
function MoreShapesDropdown({ activeTool, onToolChange, S }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        title="More Shapes"
        aria-label="More Shapes"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        style={{
          ...S.toolBtn,
          ...(MORE_SHAPES.some(({ id }) => id === activeTool)
            ? S.toolBtnOn
            : {}),
        }}
      >
        <MoreShapesSVG />
        <span style={S.tlabel}>More Shapes</span>
        <span style={{ fontSize: 10, marginLeft: 3 }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="More flowchart shapes"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            minWidth: 205,
            padding: 6,
            marginTop: 4,
            background: "#151521",
            border: "1px solid #303044",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          }}
        >
          {MORE_SHAPES.map(({ id, label }) => {
            const active = activeTool === id;

            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                aria-pressed={active}
                onClick={() => {
                  onToolChange(id);
                  setOpen(false);
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.background = "#262638";
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = active
                    ? "#373752"
                    : "transparent";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 5,
                  textAlign: "left",
                  color: active ? "#fff" : "#d1d1df",
                  background: active ? "#373752" : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <FlowShapeIcon type={id} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <span
      style={{
        width: 1,
        height: 28,
        background: "#1e1e2e",
        flexShrink: 0,
        margin: "0 4px",
      }}
    />
  );
}

function ToolButton({ active, children, onClick, title, S }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.toolBtn,
        ...(active ? S.toolBtnOn : {}),
        ...(!active && hovered ? S.toolBtnHov : {}),
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ danger, primary, children, onClick, S }) {
  const [hovered, setHovered] = useState(false);

  let style = S.actBtn;

  if (primary) {
    style = hovered ? S.actBtnPriHov : S.actBtnPri;
  } else if (danger && hovered) {
    style = { ...S.actBtn, ...S.actBtnDangerHov };
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {children}
    </button>
  );
}