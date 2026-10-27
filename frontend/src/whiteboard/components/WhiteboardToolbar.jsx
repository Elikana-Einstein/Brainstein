
import React, { useState } from "react";
import {
  WHITEBOARD_PALETTE,
  STROKE_SIZES,
  WHITEBOARD_TOOLS,
} from "../hooks/whiteboard.constants.js";

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

function TextSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4.5h14v2H11.5v9h-3v-9H3v-2z" />
    </svg>
  );
}

function EraserSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M3 17l3.5-3.5L14.5 5l3 3-8 8L7 17H3z" />
      <path d="M11.5 6.5l2 2" />
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

const TOOL_ICONS = {
  pen: PenSVG,
  rect: RectSVG,
  circle: CircleSVG,
  line: LineSVG,
  text: TextSVG,
  eraser: EraserSVG,
  select: MousePointer2,
};
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
              transform:
                activeColor === hex ? "scale(1.22)" : "scale(1)",
                margin: activeColor === hex ? '2px 4px 2px 4px': '',
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
                  border: '1px solid white',
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
          {isUpdating ? "Update" : "save"}
        </ActionBtn>
      </div>
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
