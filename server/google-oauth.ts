import { google } from "googleapis";
import { db } from "@db";
import { tasks, goals, userTokens } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { Express } from "express";

export function registerGoogleOAuthRoutes(app: Express) {
  // 1) INITIATE GOOGLE OAUTH
  app.get("/api/auth/google/init", (req, res) => {
    
    // We assume you have set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and a
    // callback URL in your environment variables or .env
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI, // e.g. "http://localhost:5000/auth/google/callback"
    );

    const scopes = [
      "https://www.googleapis.com/auth/calendar", // or whatever scope(s) you need
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline", // needed for refresh_token
      prompt: "consent", // ensures we get a refresh_token
      scope: scopes,
    });

    // Redirect user to Google
    res.redirect(url);
  });

  // 2) GOOGLE OAUTH CALLBACK
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const code = req.query.code as string | undefined;
      
      if (!code) {
        return res.status(400).json({ error: "No code returned from Google" });
      }

      // Create an OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      // Exchange the code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      

      if (!req.isAuthenticated()) {
        return res
          .status(401)
          .json({ error: "Not authenticated in local system" });
      }

      const userId = req.user!.id; // or however you store it in passport

      // Convert expiry_date to ISO string (if it exists)

      // Save tokens to DB
      const existingRecord = await db.query.userTokens.findFirst({
        where: eq(userTokens.userId, userId),
      });

      if (!existingRecord) {
        // Insert new
        await db.insert(userTokens).values({
          userId,
          provider: "google",
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null, // Save expiry date
        });
      } else {
        // Update existing
        await db
          .update(userTokens)
          .set({
            accessToken: tokens.access_token || existingRecord.accessToken,
            refreshToken: tokens.refresh_token || existingRecord.refreshToken,
            expiresAt: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : existingRecord.expiresAt, // Update expiry date
          })
          .where(eq(userTokens.id, existingRecord.id));
      }

      // Redirect the user back to their dashboard
      res.redirect("/profile?google=connected");
    } catch (error) {
      console.error("Google OAuth Callback Error:", error);
      res.status(500).json({ error: "Failed to complete Google OAuth" });
    }
  });

  app.post("/api/auth/google/refresh", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res
          .status(401)
          .json({ error: "Not authenticated in local system" });
      }

      const userId = req.user!.id;

      // Fetch the user's refresh token from the database
      const [userToken] = await db
        .select()
        .from(userTokens)
        .where(eq(userTokens.userId, userId))
        .limit(1);

      if (!userToken || !userToken.refreshToken) {
        return res
          .status(400)
          .json({ error: "No refresh token available for this user" });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      // Set the refresh token
      oauth2Client.setCredentials({
        refresh_token: userToken.refreshToken,
      });

      // Refresh the token
      const { credentials } = await oauth2Client.refreshAccessToken();

      const newAccessToken = credentials.access_token;
      const newExpiryDate = credentials.expiry_date;

      if (!newAccessToken) {
        return res
          .status(500)
          .json({ error: "Failed to refresh access token" });
      }

      // Update the token in the database
      await db
        .update(userTokens)
        .set({
          accessToken: newAccessToken,
          // Save the expiry date if provided
        })
        .where(eq(userTokens.id, userToken.id));

      res.json({
        message: "Access token refreshed successfully",
        accessToken: newAccessToken,
        expiryDate: newExpiryDate,
      });
    } catch (error) {
      console.error("Error refreshing Google token:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  //sync-calender
  app.post("/api/goals/:goalId/sync-calendar", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const userId = req.user!.id;
      const goalId = parseInt(req.params.goalId);

      // Fetch the user's Google tokens
      let tokenRecord;
      try {
        [tokenRecord] = await db
          .select()
          .from(userTokens)
          .where(
            and(
              eq(userTokens.userId, userId),
              eq(userTokens.provider, "google"),
            ),
          )
          .limit(1);
      } catch (error) {
        console.error("Database error fetching user tokens:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch user tokens from the database" });
      }

      if (!tokenRecord || !tokenRecord.refreshToken) {
        return res
          .status(400)
          .json({
            error: "Google Calendar not connected or refresh token missing",
          });
      }

      // Check if the access token is expired
      const isTokenExpired =
        tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) <= new Date();

      // If expired, refresh the token
      let accessToken = tokenRecord.accessToken;
      if (isTokenExpired) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI,
          );

          oauth2Client.setCredentials({
            refresh_token: tokenRecord.refreshToken,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();

          accessToken = credentials.access_token || null;
          const newExpiryDate = credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null;

          // Update the database with the new token
          await db
            .update(userTokens)
            .set({
              accessToken,
              expiresAt: newExpiryDate,
            })
            .where(eq(userTokens.id, tokenRecord.id));

          console.log("Access token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh access token:", error);
          return res
            .status(500)
            .json({ error: "Failed to refresh access token" });
        }
      }

      // Proceed with syncing tasks to the calendar
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: tokenRecord.refreshToken,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Fetch the goal and tasks
      let goal;
      try {
        [goal] = await db
          .select()
          .from(goals)
          .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
          .limit(1);
      } catch (error) {
        console.error("Database error fetching goal:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch goal from the database" });
      }

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      let goalTasks;
      try {
        goalTasks = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.goalId, goalId), eq(tasks.userId, userId)));
      } catch (error) {
        console.error("Database error fetching tasks:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch tasks from the database" });
      }

      if (goalTasks.length === 0) {
        return res.status(400).json({ error: "No tasks available to sync" });
      }

      // Sync each task as a full-day event
      for (const task of goalTasks) {
        if (!task.plannedDate) {
          console.warn(`Skipping task ${task.id} due to missing plannedDate`);
          continue;
        }

        const plannedDate = new Date(task.plannedDate);
        const plannedDateStr = plannedDate.toISOString().split("T")[0];

        if (task.eventId) {
          // Fetch the existing event to see if it needs updating
          try {
            const existingEvent = await calendar.events.get({
              calendarId: "primary",
              eventId: task.eventId,
            });

            if (existingEvent.data.start?.date !== plannedDateStr) {
              // Delete the old event if the date has changed
              await calendar.events.delete({
                calendarId: "primary",
                eventId: task.eventId,
              });
              console.log(`Deleted old event for task ${task.id}`);
            } else {
              console.log(`Task ${task.id} is already up-to-date`);
              continue;
            }
          } catch (error) {
            console.warn(
              `Event for task ${task.id} not found, creating a new one`,
            );
          }
        }

        // Build the event
        const event = {
          summary: task.title,
          description: task.notes || "No notes provided",
          start: { date: plannedDateStr },
          end: { date: plannedDateStr },
        };

        try {
          const createdEvent = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
          });

          console.log(`Task ${task.id} synced as event on ${plannedDateStr}`);

          // Save the event ID to the database
          await db
            .update(tasks)
            .set({ eventId: createdEvent.data.id })
            .where(eq(tasks.id, task.id));
        } catch (error) {
          console.error(`Failed to sync task ${task.id} to calendar:`, error);
        }
      }

      res.json({
        message: "Tasks synced with Google Calendar as full-day events",
      });
    } catch (error) {
      console.error("Error syncing tasks with calendar:", error);
      res
        .status(500)
        .json({ error: "Failed to sync tasks with Google Calendar" });
    }
  });
}
