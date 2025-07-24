import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("waiting"), // waiting, playing, showing_results, finished
  createdAt: timestamp("created_at").defaultNow().notNull(),
  creatorId: integer("creator_id").notNull(),
  winnerId: integer("winner_id"),
  currentRound: integer("current_round").default(1),
  currentQuestion: integer("current_question").default(1), // 1 or 2 (per round)
  questionData: jsonb("question_data"), // Current question object
  questionDeadline: timestamp("question_deadline"),
  lastRoundWinnerId: integer("last_round_winner_id"),
  waitingForAnswers: boolean("waiting_for_answers").default(false),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  score: integer("score").default(0),
  sessionId: text("session_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: 'cascade' }),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  round: integer("round").notNull(),
  question: integer("question").notNull(), // 1 or 2
  answer: text("answer").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  isCorrect: boolean("is_correct"),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: 'cascade' }),
  roundNumber: integer("round_number").notNull(),
  winnerId: integer("winner_id").references(() => players.id),
  question1Data: jsonb("question1_data"),
  question2Data: jsonb("question2_data"),
  completedAt: timestamp("completed_at"),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  options: jsonb("options"), // Array of strings for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(), // "multiple_choice" or "integer"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  submittedAt: true,
  isCorrect: true,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  completedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Question = typeof questions.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
