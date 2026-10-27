
import React from "react";

export default function WhiteboardStatusBar({
  activeTool,
  activeColor,
  width,
  height,
  S,
  toolLabel,
  zoomLevel = 1,
  resetZoom,
}) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  const zoomButtonStyle = {
    border: "1px solid currentColor",
    background: "transparent",
    color: "inherit",
    borderRadius: "7px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  return (
    <div
      style={{
        ...S.statusBar,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      {/* Active tool */}
      <span
        style={{
          ...S.chip,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            ...S.chipDot,
            background: activeColor,
            boxShadow: `0 0 7px ${activeColor}`,
          }}
        />
        {toolLabel}
      </span>

      {/* Canvas dimensions */}
      <span style={S.dimText}>
        {width} × {height}px
      </span>

      {/* Zoom controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 6px",
          border: "1px solid currentColor",
          borderRadius: "10px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            minWidth: "42px",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
          title="Current canvas zoom"
        >
          {zoomPercentage}%
        </span>

        <button
          type="button"
          onClick={resetZoom}
          disabled={zoomPercentage === 100}
          style={{
            ...zoomButtonStyle,
            opacity: zoomPercentage === 100 ? 0.5 : 1,
            cursor:
              zoomPercentage === 100 ? "default" : "pointer",
          }}
          title="Reset zoom to 100%"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
