import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date").notNull(),
  progress: integer("progress").default(0).notNull(),
  totalTasks: integer("total_tasks").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentTaskId: integer("parent_task_id").references(() => tasks.id),
  isSubtask: boolean("is_subtask").default(false).notNull(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  coins: integer("coins").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const goalRelations = relations(goals, ({ many }) => ({
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
}));

export const insertGoalSchema = createInsertSchema(goals);
export const selectGoalSchema = createSelectSchema(goals);
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
