export function FlowShapeIcon({ type }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  };

  const shapes = {
    terminator: (
      <rect x="2" y="5" width="20" height="12" rx="6" {...common} />
    ),
    decision: (
      <path d="M12 2 L22 10 L12 18 L2 10 Z" {...common} />
    ),
    inputOutput: (
      <path d="M6 4 H22 L18 16 H2 Z" {...common} />
    ),
    document: (
      <path d="M3 3 H21 V14 Q16 11 12 14 T3 14 Z" {...common} />
    ),
    database: (
      <>
        <path d="M3 5 C3 1 21 1 21 5 V15 C21 19 3 19 3 15 Z" {...common} />
        <path d="M3 5 C3 9 21 9 21 5 M3 10 C3 14 21 14 21 10" {...common} />
      </>
    ),
    predefinedProcess: (
      <>
        <rect x="3" y="3" width="18" height="14" {...common} />
        <path d="M7 3 V17 M17 3 V17" {...common} />
      </>
    ),
    manualInput: (
      <path d="M3 7 L21 3 V17 H3 Z" {...common} />
    ),
    connector: (
      <circle cx="12" cy="10" r="8" {...common} />
    ),
    arrow: (
      <path d="M2 7 H15 V3 L22 10 L15 17 V13 H2 Z" {...common} />
    ),
    eraser: (
        <g {...common}>
          <path d="M3 13 L12 4 Q13 3 14 4 L21 11 L13 19 H8 Z" />
          <path d="M8 19 L14 13" />
        </g>
          ),      

    text: (
        <g
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M3 5 H21" />
          <path d="M12 5 V19" />
          <path d="M8 19 H16" />
        </g>
),
  };

  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 24 20"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {shapes[type] || <rect x="3" y="3" width="18" height="14" {...common} />}
    </svg>
  );
}