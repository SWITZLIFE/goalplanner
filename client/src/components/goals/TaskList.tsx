import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil } from "lucide-react";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { TaskEditor } from "./TaskEditor";

interface TaskListProps {
  tasks: Task[];
  goalId: number;
}

export function TaskList({ tasks, goalId }: TaskListProps) {
  const { updateTask, createTask } = useGoals();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<number | null>(null);

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    await updateTask({ taskId, completed });
  };

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      await createTask({
        goalId,
        title: newTaskTitle.trim(),
        isSubtask: !!addingSubtaskFor,
        parentTaskId: addingSubtaskFor || undefined,
      });
      setNewTaskTitle("");
      setShowAddDialog(false);
      setAddingSubtaskFor(null);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes} minutes`;
  };

  const mainTasks = tasks.filter(task => !task.isSubtask);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddingSubtaskFor(null);
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {mainTasks.map((mainTask) => {
        const subtasks = tasks.filter(task => task.parentTaskId === mainTask.id);
        
        return (
          <div key={mainTask.id} className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`task-${mainTask.id}`}
                  checked={mainTask.completed}
                  onCheckedChange={(checked) => handleTaskToggle(mainTask.id, checked as boolean)}
                />
                <label
                  htmlFor={`task-${mainTask.id}`}
                  className={`font-medium flex-grow ${mainTask.completed ? "line-through text-muted-foreground" : ""}`}
                >
                  {mainTask.title}
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedTask(mainTask);
                    setShowEditDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingSubtaskFor(mainTask.id);
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subtask
                </Button>
              </div>
              {subtasks.some(task => task.estimatedMinutes) && (
                <div className="text-xs text-muted-foreground ml-6">
                  Total estimated time: {
                    formatTime(
                      subtasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
                    )
                  }
                </div>
              )}
            </div>
            
            <div className="ml-6 space-y-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`task-${subtask.id}`}
                    checked={subtask.completed}
                    onCheckedChange={(checked) => handleTaskToggle(subtask.id, checked as boolean)}
                  />
                  <div className="flex flex-col flex-grow">
                    <label
                      htmlFor={`task-${subtask.id}`}
                      className={`text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}
                    >
                      {subtask.title}
                    </label>
                    {subtask.estimatedMinutes && (
                      <span className="text-xs text-muted-foreground">
                        Estimated time: {subtask.estimatedMinutes} minutes
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedTask(subtask);
                      setShowEditDialog(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addingSubtaskFor ? "Add Subtask" : "Add Task"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setNewTaskTitle("");
              setAddingSubtaskFor(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddTask}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskEditor
          task={selectedTask}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </div>
  );
}
