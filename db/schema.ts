import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create schema with custom validation
const baseSchema = createInsertSchema(users);

export const insertUserSchema = baseSchema.extend({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

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
  plannedDate: timestamp("planned_date"),
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

export const rewardItems = pgTable("reward_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  type: text("type").notNull(), // 'digital', 'perk', 'discount'
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Define the base types from the schema
export type BaseGoal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// Extend the Goal type to include tasks
export interface Goal extends BaseGoal {
  tasks?: Task[];
}