
import { useEffect, useState } from "react";

import {
  DEFAULT_CANVAS_SIZE,
  CANVAS_SIZE_LIMITS,
} from "./whiteboard.constants";

const getCanvasHeight = () => {
  const {
    minHeight,
    maxHeight,
    viewportHeightRatio,
  } = CANVAS_SIZE_LIMITS;

  return Math.max(
    minHeight,
    Math.min(
      window.innerHeight * viewportHeightRatio,
      maxHeight
    )
  );
};

export default function useWhiteboardDimensions(containerRef) {
  const [dimensions, setDimensions] = useState(
    DEFAULT_CANVAS_SIZE
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return undefined;

    const measure = () => {
      const width = container.clientWidth;

      if (width <= 0) return;

      setDimensions({
        width,
        height: getCanvasHeight(),
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef]);

  return dimensions;
}
