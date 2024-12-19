CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "username" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "email_verified" boolean NOT NULL DEFAULT false,
    "verification_token" text,
    "reset_password_token" text,
    "reset_password_expires" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "goals" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "title" text NOT NULL,
    "description" text,
    "target_date" timestamp NOT NULL,
    "progress" integer NOT NULL DEFAULT 0,
    "total_tasks" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" serial PRIMARY KEY,
    "goal_id" integer NOT NULL REFERENCES "goals"("id"),
    "title" text NOT NULL,
    "completed" boolean NOT NULL DEFAULT false,
    "estimated_minutes" integer,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "parent_task_id" integer REFERENCES "tasks"("id"),
    "is_subtask" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "rewards" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "coins" integer NOT NULL DEFAULT 0,
    "last_updated" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reward_items" (
    "id" serial PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "cost" integer NOT NULL,
    "icon" text NOT NULL,
    "type" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);
