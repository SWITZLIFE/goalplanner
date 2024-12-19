-- Drop and recreate tables to ensure consistent column naming
DROP TABLE IF EXISTS "reward_items" CASCADE;
DROP TABLE IF EXISTS "rewards" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;
DROP TABLE IF EXISTS "goals" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "username" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "emailVerified" boolean NOT NULL DEFAULT false,
    "verificationToken" text,
    "resetPasswordToken" text,
    "resetPasswordExpires" timestamp,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "goals" (
    "id" serial PRIMARY KEY,
    "userId" integer NOT NULL REFERENCES "users"("id"),
    "title" text NOT NULL,
    "description" text,
    "targetDate" timestamp NOT NULL,
    "progress" integer NOT NULL DEFAULT 0,
    "totalTasks" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" serial PRIMARY KEY,
    "goalId" integer NOT NULL REFERENCES "goals"("id"),
    "title" text NOT NULL,
    "completed" boolean NOT NULL DEFAULT false,
    "estimatedMinutes" integer,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "parentTaskId" integer REFERENCES "tasks"("id"),
    "isSubtask" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "rewards" (
    "id" serial PRIMARY KEY,
    "userId" integer NOT NULL REFERENCES "users"("id"),
    "coins" integer NOT NULL DEFAULT 0,
    "lastUpdated" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reward_items" (
    "id" serial PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "cost" integer NOT NULL,
    "icon" text NOT NULL,
    "type" text NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now()
);
