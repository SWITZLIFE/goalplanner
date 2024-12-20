import { useEffect, useState } from "react";
import { Droppable, DroppableProps } from "react-beautiful-dnd";

/**
 * A wrapper component that makes react-beautiful-dnd work in React.StrictMode
 * This is needed because react-beautiful-dnd's Droppable has issues with StrictMode's double-mounting
 */
export function StrictModeDroppable({ children, ...props }: DroppableProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Using Promise to ensure proper timing in StrictMode
    Promise.resolve().then(() => {
      const animation = requestAnimationFrame(() => setEnabled(true));
      return () => {
        cancelAnimationFrame(animation);
        setEnabled(false);
      };
    });
  }, []);

  if (!enabled) {
    // Render a placeholder div to maintain layout while the droppable initializes
    return (
      <div style={{ minHeight: 1 }} />
    );
  }

  return <Droppable {...props}>{children}</Droppable>;
}
