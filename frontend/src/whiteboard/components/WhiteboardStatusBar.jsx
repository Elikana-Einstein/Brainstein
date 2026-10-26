
import React from "react";

export default function WhiteboardStatusBar({
  activeTool,
  activeColor,
  width,
  height,
  S,
  toolLabel,
}) {
  return (
    <div style={S.statusBar}>
      <span style={S.chip}>
        <span
          style={{
            ...S.chipDot,
            background: activeColor,
            boxShadow: `0 0 7px ${activeColor}`,
          }}
        />
        {toolLabel}
      </span>

      <span style={S.dimText}>
        {width} × {height}px
      </span>
    </div>
  );
}
