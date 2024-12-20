import { useEffect, useState, memo } from "react";
import { Droppable, DroppableProps } from "react-beautiful-dnd";

/**
 * A wrapper component that makes react-beautiful-dnd work in React.StrictMode
 * This is needed because react-beautiful-dnd's Droppable has issues with StrictMode's double-mounting
 */
function StrictModeDroppableComponent({ children, ...props }: DroppableProps) {
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
    return <div style={{ minHeight: 1 }} />;
  }

  return <Droppable {...props}>{children}</Droppable>;
}

export const StrictModeDroppable = memo(StrictModeDroppableComponent);
