import { Router } from "express";
import { db } from "@db";
import { notes, tasks, type NewNote } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Get all notes for a goal (including task-related notes)
router.get("/api/goals/:goalId/notes", async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);
    console.log('Fetching notes for goal:', goalId);
    
    const allNotes = await db.select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      goalId: notes.goalId,
      taskId: notes.taskId,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      task: {
        id: tasks.id,
        title: tasks.title,
      },
    })
    .from(notes)
    .leftJoin(tasks, eq(notes.taskId, tasks.id))
    .where(eq(notes.goalId, goalId))
    .orderBy(desc(notes.createdAt));

    console.log('Found notes:', allNotes);
    res.json(allNotes);
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

// Create a new note
router.post("/api/goals/:goalId/notes", async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);
    const { title, content, taskId } = req.body;

    const newNote: NewNote = {
      title,
      content,
      goalId,
      taskId: taskId ? parseInt(taskId) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(notes).values(newNote).returning();
    res.json(created);
  } catch (error) {
    console.error("Failed to create note:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
});

// Update a note
router.put("/api/notes/:noteId", async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId);
    const { title, content } = req.body;

    const [updated] = await db
      .update(notes)
      .set({
        title,
        content,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, noteId))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update note:", error);
    res.status(500).json({ message: "Failed to update note" });
  }
});

// Delete a note
router.delete("/api/notes/:noteId", async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId);
    const [deleted] = await db
      .delete(notes)
      .where(eq(notes.id, noteId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Failed to delete note:", error);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

export default router;
