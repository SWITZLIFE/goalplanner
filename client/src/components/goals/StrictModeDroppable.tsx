import { useEffect, useState, memo } from "react";
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
const StrictModeDroppableComponent = ({ children, ...props }: StrictModeDroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use a short timeout to ensure the component is mounted
    const timeout = setTimeout(() => {
      setEnabled(true);
    }, 50);

    return () => {
      clearTimeout(timeout);
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
};

// Use memo to prevent unnecessary re-renders and handle defaultProps warning
export const StrictModeDroppable = memo(StrictModeDroppableComponent);
