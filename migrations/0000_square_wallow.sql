CREATE TABLE "answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"round" integer NOT NULL,
	"question" integer NOT NULL,
	"answer" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"is_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" integer NOT NULL,
	"winner_id" integer,
	"current_round" integer DEFAULT 1,
	"current_question" integer DEFAULT 1,
	"question_data" jsonb,
	"all_round_questions" jsonb,
	"question_deadline" timestamp,
	"last_round_winner_id" integer,
	"waiting_for_answers" boolean DEFAULT false,
	CONSTRAINT "games_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"score" integer DEFAULT 0,
	"session_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"options" jsonb,
	"correct_answer" text NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"winner_id" integer,
	"question1_data" jsonb,
	"question2_data" jsonb,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;