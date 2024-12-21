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
  totalMinutesSpent: integer("total_minutes_spent").default(0).notNull(),
  plannedDate: timestamp("planned_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentTaskId: integer("parent_task_id").references(() => tasks.id),
  isSubtask: boolean("is_subtask").default(false).notNull(),
  notes: text("notes"),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  // Note: order field exists in DB but is no longer used in the application
  order: integer("order"),
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

export const purchasedRewards = pgTable("purchased_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardItemId: integer("reward_item_id").notNull().references(() => rewardItems.id, { onDelete: "cascade" }),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

// Add relations for rewardItems
export const rewardItemsRelations = relations(rewardItems, ({ many }) => ({
  purchases: many(purchasedRewards),
}));

// Add relations for purchasedRewards
export const purchasedRewardsRelations = relations(purchasedRewards, ({ one }) => ({
  user: one(users, {
    fields: [purchasedRewards.userId],
    references: [users.id],
  }),
  rewardItem: one(rewardItems, {
    fields: [purchasedRewards.rewardItemId],
    references: [rewardItems.id],
  }),
}));

export type PurchasedReward = typeof purchasedRewards.$inferSelect;
export type InsertPurchasedReward = typeof purchasedRewards.$inferInsert;

export const timeTracking = pgTable("time_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  coinsEarned: integer("coins_earned").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ many }) => ({
  tasks: many(tasks, {
    fields: [goals.id],
    references: [tasks.goalId],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
  timeTrackingSessions: many(timeTracking, {
    fields: [tasks.id],
    references: [timeTracking.taskId],
  }),
}));

export const insertGoalSchema = createInsertSchema(goals);
export const selectGoalSchema = createSelectSchema(goals);
// Create custom task update schema that includes order
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const updateTaskSchema = selectTaskSchema.partial().extend({
  completed: z.boolean().optional(),
  title: z.string().optional(),
  estimatedMinutes: z.number().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Define the base types from the schema
export type BaseGoal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Extend the Goal type to include tasks
export interface Goal extends BaseGoal {
  tasks?: Task[];
}

export const timeTrackingRelations = relations(timeTracking, ({ one }) => ({
  user: one(users, {
    fields: [timeTracking.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [timeTracking.taskId],
    references: [tasks.id],
  }),
}));

export const visionBoardImages = pgTable("vision_board_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visionBoardRelations = relations(visionBoardImages, ({ one }) => ({
  user: one(users, {
    fields: [visionBoardImages.userId],
    references: [users.id],
  }),
}));

export const insertVisionBoardImageSchema = createInsertSchema(visionBoardImages);
export const selectVisionBoardImageSchema = createSelectSchema(visionBoardImages);
export type VisionBoardImage = typeof visionBoardImages.$inferSelect;
export type NewVisionBoardImage = typeof visionBoardImages.$inferInsert;

export const insertTimeTrackingSchema = createInsertSchema(timeTracking);
export const selectTimeTrackingSchema = createSelectSchema(timeTracking);
export type TimeTracking = typeof timeTracking.$inferSelect;
export type NewTimeTracking = typeof timeTracking.$inferInsert;