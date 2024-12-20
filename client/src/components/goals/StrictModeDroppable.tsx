import { useEffect, useState } from "react";
import { Droppable, type DroppableProps } from "react-beautiful-dnd";

/**
 * A wrapper component that makes react-beautiful-dnd work in React.StrictMode
 * This is needed because react-beautiful-dnd's Droppable has issues with StrictMode's double-mounting
 */
export function StrictModeDroppable(props: DroppableProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animation = requestAnimationFrame(() => {
        setEnabled(true);
      });
      return () => {
        cancelAnimationFrame(animation);
        setEnabled(false);
      };
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!enabled) {
    // Render a placeholder div to maintain layout while the droppable initializes
    return <div style={{ minHeight: 1 }} />;
  }

  return <Droppable {...props}>{props.children}</Droppable>;
}
