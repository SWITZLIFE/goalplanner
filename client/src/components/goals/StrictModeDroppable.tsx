import { useEffect, useState } from "react";
import type {
  DroppableProps,
  DroppableProvided,
  DroppableStateSnapshot
} from "react-beautiful-dnd";
import { Droppable } from "react-beautiful-dnd";

type StrictModeDroppableProps = Omit<DroppableProps, 'children'> & {
  children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement;
};

/**
 * A wrapper component that makes react-beautiful-dnd work in React.StrictMode
 * This is needed because react-beautiful-dnd's Droppable has issues with StrictMode's double-mounting
 */
export function StrictModeDroppable({ children, ...props }: StrictModeDroppableProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to ensure the component is mounted
    const animation = requestAnimationFrame(() => {
      setEnabled(true);
    });

    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <Droppable {...props}>
      {(provided, snapshot) => children(provided, snapshot)}
    </Droppable>
  );
}
