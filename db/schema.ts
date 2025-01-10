import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"),
  targetDate: timestamp("target_date").notNull(),
  progress: integer("progress").default(0).notNull(),
  totalTasks: integer("total_tasks").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  visionStatement: text("vision_statement"),
  visionResponses: text("vision_responses"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  totalMinutesSpent: integer("total_minutes_spent").default(0).notNull(),
  plannedDate: timestamp("planned_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentTaskId: integer("parent_task_id").references(() => tasks.id),
  isSubtask: boolean("is_subtask").default(false).notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  order: integer("order"),
  eventId: text("event_id"),
});

export const timeTracking = pgTable("time_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  coinsEarned: integer("coins_earned").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyInspirations = pgTable("daily_inspirations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  dailyInspirations: many(dailyInspirations),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  timeTrackingSessions: many(timeTracking),
  subtasks: many(tasks, { relationName: 'parentChild' }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'parentChild'
  }),
}));

export const dailyInspirationsRelations = relations(dailyInspirations, ({ one }) => ({
  user: one(users, {
    fields: [dailyInspirations.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [dailyInspirations.goalId],
    references: [goals.id],
  }),
}));

export const insertDailyInspirationSchema = createInsertSchema(dailyInspirations);
export const selectDailyInspirationSchema = createSelectSchema(dailyInspirations);
export type DailyInspiration = typeof dailyInspirations.$inferSelect;
export type NewDailyInspiration = typeof dailyInspirations.$inferInsert;

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

export const insertGoalSchema = createInsertSchema(goals);
export const selectGoalSchema = createSelectSchema(goals);
export type Goal = typeof goals.$inferSelect & { tasks?: typeof tasks.$inferSelect[] };
export type NewGoal = typeof goals.$inferInsert;

export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export const futureMessages = pgTable("future_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalDailyQuotes = pgTable("goal_daily_quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const futureMessagesRelations = relations(futureMessages, ({ one }) => ({
  user: one(users, {
    fields: [futureMessages.userId],
    references: [users.id],
  }),
}));

export const goalDailyQuotesRelations = relations(goalDailyQuotes, ({ one }) => ({
  user: one(users, {
    fields: [goalDailyQuotes.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [goalDailyQuotes.goalId],
    references: [goals.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [notes.goalId],
    references: [goals.id],
  }),
  task: one(tasks, {
    fields: [notes.taskId],
    references: [tasks.id],
  }),
}));


export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coins: integer("coins").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const rewardItems = pgTable("reward_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
  icon: text("icon").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchasedRewards = pgTable("purchased_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardItemId: integer("reward_item_id").notNull().references(() => rewardItems.id, { onDelete: "cascade" }),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export const rewardItemsRelations = relations(rewardItems, ({ many }) => ({
  purchases: many(purchasedRewards),
}));

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

export const visionBoardImages = pgTable("vision_board_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const userTokens = pgTable("user_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userTokensRelations = relations(userTokens, ({ one }) => ({
  user: one(users, { fields: [userTokens.userId], references: [users.id] }),
}));

export const insertNoteSchema = createInsertSchema(notes);
export const selectNoteSchema = createSelectSchema(notes);
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export const coinHistory = pgTable("coin_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  balance: integer("balance").notNull(),
  reason: text("reason").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const coinHistoryRelations = relations(coinHistory, ({ one }) => ({
  user: one(users, {
    fields: [coinHistory.userId],
    references: [users.id],
  }),
}));

export const insertCoinHistorySchema = createInsertSchema(coinHistory);
export const selectCoinHistorySchema = createSelectSchema(coinHistory);
export type CoinHistory = typeof coinHistory.$inferSelect;
export type NewCoinHistory = typeof coinHistory.$inferInsert;

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

// Add new forum related tables
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  slug: text("slug").unique().notNull(),
  icon: text("icon").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => forumCategories.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: integer("parent_comment_id").references(() => forumComments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumReactions = pgTable("forum_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => forumComments.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add relations for forum tables
export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  posts: many(forumPosts),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumPosts.categoryId],
    references: [forumCategories.id],
  }),
  author: one(users, {
    fields: [forumPosts.userId],
    references: [users.id],
  }),
  comments: many(forumComments),
  reactions: many(forumReactions),
}));

export const forumCommentsRelations = relations(forumComments, ({ one, many }) => ({
  post: one(forumPosts, {
    fields: [forumComments.postId],
    references: [forumPosts.id],
  }),
  author: one(users, {
    fields: [forumComments.userId],
    references: [users.id],
  }),
  reactions: many(forumReactions),
  // Add relations for nested comments
  parentComment: one(forumComments, {
    fields: [forumComments.parentCommentId],
    references: [forumComments.id],
    relationName: 'commentReplies'
  }),
  replies: many(forumComments, {
    relationName: 'commentReplies'
  }),
}));

// Add Zod schemas for the new tables
export const insertForumCategorySchema = createInsertSchema(forumCategories);
export const selectForumCategorySchema = createSelectSchema(forumCategories);
export type ForumCategory = typeof forumCategories.$inferSelect;
export type NewForumCategory = typeof forumCategories.$inferInsert;

export const insertForumPostSchema = createInsertSchema(forumPosts);
export const selectForumPostSchema = createSelectSchema(forumPosts);
export type ForumPost = typeof forumPosts.$inferSelect;
export type NewForumPost = typeof forumPosts.$inferInsert;

export const insertForumCommentSchema = createInsertSchema(forumComments);
export const selectForumCommentSchema = createSelectSchema(forumComments);
export type ForumComment = typeof forumComments.$inferSelect;
export type NewForumComment = typeof forumComments.$inferInsert;

export const insertForumReactionSchema = createInsertSchema(forumReactions);
export const selectForumReactionSchema = createSelectSchema(forumReactions);
export type ForumReaction = typeof forumReactions.$inferSelect;
export type NewForumReaction = typeof forumReactions.$inferInsert;

export const weeklyGoalSummaries = pgTable("weekly_goal_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weeklyGoalSummariesRelations = relations(weeklyGoalSummaries, ({ one }) => ({
  user: one(users, {
    fields: [weeklyGoalSummaries.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [weeklyGoalSummaries.goalId],
    references: [goals.id],
  }),
}));

export const insertWeeklyGoalSummarySchema = createInsertSchema(weeklyGoalSummaries);
export const selectWeeklyGoalSummarySchema = createSelectSchema(weeklyGoalSummaries);
export type WeeklyGoalSummary = typeof weeklyGoalSummaries.$inferSelect;
export type NewWeeklyGoalSummary = typeof weeklyGoalSummaries.$inferInsert;