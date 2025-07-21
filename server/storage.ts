import { games, players, answers, rounds, type Game, type Player, type Answer, type Round, type InsertGame, type InsertPlayer, type InsertAnswer, type InsertRound } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export interface IStorage {
  // Games
  createGame(game: InsertGame): Promise<Game>;
  getGameByCode(code: string): Promise<Game | undefined>;
  getGameById(id: number): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  
  // Players
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByGameId(gameId: number): Promise<Player[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  updatePlayerScore(id: number, score: number): Promise<Player | undefined>;
  
  // Answers
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByGameRound(gameId: number, round: number, question: number): Promise<Answer[]>;
  
  // Rounds
  createRound(round: InsertRound): Promise<Round>;
  getRoundsByGameId(gameId: number): Promise<Round[]>;
  updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private players: Map<number, Player>;
  private answers: Map<number, Answer>;
  private rounds: Map<number, Round>;
  private currentGameId: number;
  private currentPlayerId: number;
  private currentAnswerId: number;
  private currentRoundId: number;

  constructor() {
    this.games = new Map();
    this.players = new Map();
    this.answers = new Map();
    this.rounds = new Map();
    this.currentGameId = 1;
    this.currentPlayerId = 1;
    this.currentAnswerId = 1;
    this.currentRoundId = 1;
  }

  // Games
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const game: Game = {
      ...insertGame,
      id,
      createdAt: new Date(),
      status: insertGame.status || "waiting",
      winnerId: insertGame.winnerId || null,
      currentRound: insertGame.currentRound || null,
      currentQuestion: insertGame.currentQuestion || null,
      questionData: insertGame.questionData || null,
      questionDeadline: insertGame.questionDeadline || null,
      lastRoundWinnerId: insertGame.lastRoundWinnerId || null,
      waitingForAnswers: insertGame.waitingForAnswers || null,
    };
    this.games.set(id, game);
    return game;
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.code === code);
  }

  async getGameById(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  // Players
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.currentPlayerId++;
    const player: Player = {
      ...insertPlayer,
      id,
      joinedAt: new Date(),
      score: insertPlayer.score || 0,
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayersByGameId(gameId: number): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.gameId === gameId);
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async updatePlayerScore(id: number, score: number): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, score };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  // Answers
  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = this.currentAnswerId++;
    const answer: Answer = {
      ...insertAnswer,
      id,
      submittedAt: new Date(),
      isCorrect: null,
    };
    this.answers.set(id, answer);
    return answer;
  }

  async getAnswersByGameRound(gameId: number, round: number, question: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      answer => answer.gameId === gameId && answer.round === round && answer.question === question
    );
  }

  // Rounds
  async createRound(insertRound: InsertRound): Promise<Round> {
    const id = this.currentRoundId++;
    const round: Round = {
      ...insertRound,
      id,
      completedAt: null,
      winnerId: insertRound.winnerId || null,
      question1Data: insertRound.question1Data || null,
      question2Data: insertRound.question2Data || null,
    };
    this.rounds.set(id, round);
    return round;
  }

  async getRoundsByGameId(gameId: number): Promise<Round[]> {
    return Array.from(this.rounds.values())
      .filter(round => round.gameId === gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined> {
    const round = this.rounds.get(id);
    if (!round) return undefined;
    
    const updatedRound = { ...round, ...updates };
    this.rounds.set(id, updatedRound);
    return updatedRound;
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Initialize with connection pooling and retry logic
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  // Helper method for retry logic
  private async withRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Retry failed');
  }

  // Games
  async createGame(insertGame: InsertGame): Promise<Game> {
    return this.withRetry(async () => {
      const [game] = await this.db.insert(games).values(insertGame).returning();
      return game;
    });
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    const [game] = await this.db.select().from(games).where(eq(games.code, code));
    return game;
  }

  async getGameById(id: number): Promise<Game | undefined> {
    const [game] = await this.db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const [game] = await this.db.update(games).set(updates).where(eq(games.id, id)).returning();
    return game;
  }

  // Players
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await this.db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayersByGameId(gameId: number): Promise<Player[]> {
    return await this.db.select().from(players).where(eq(players.gameId, gameId));
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const [player] = await this.db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async updatePlayerScore(id: number, score: number): Promise<Player | undefined> {
    const [player] = await this.db.update(players).set({ score }).where(eq(players.id, id)).returning();
    return player;
  }

  // Answers
  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const [answer] = await this.db.insert(answers).values(insertAnswer).returning();
    return answer;
  }

  async getAnswersByGameRound(gameId: number, round: number, question: number): Promise<Answer[]> {
    return await this.db.select().from(answers).where(
      and(
        eq(answers.gameId, gameId),
        eq(answers.round, round),
        eq(answers.question, question)
      )
    );
  }

  // Rounds
  async createRound(insertRound: InsertRound): Promise<Round> {
    const [round] = await this.db.insert(rounds).values(insertRound).returning();
    return round;
  }

  async getRoundsByGameId(gameId: number): Promise<Round[]> {
    return await this.db.select().from(rounds).where(eq(rounds.gameId, gameId)).orderBy(rounds.roundNumber);
  }

  async updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined> {
    const [round] = await this.db.update(rounds).set(updates).where(eq(rounds.id, id)).returning();
    return round;
  }
}

// Initialize database tables
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required - this application requires a Supabase database connection");
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        creator_id INTEGER NOT NULL,
        winner_id INTEGER,
        current_round INTEGER DEFAULT 1,
        current_question INTEGER DEFAULT 1,
        question_data JSONB,
        question_deadline TIMESTAMP,
        last_round_winner_id INTEGER,
        waiting_for_answers BOOLEAN DEFAULT false
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        session_id TEXT NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        question INTEGER NOT NULL,
        answer TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_correct BOOLEAN
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rounds (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        winner_id INTEGER REFERENCES players(id),
        question1_data JSONB,
        question2_data JSONB,
        completed_at TIMESTAMP
      )
    `;

    console.log("✅ Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", (error as Error).message);
    throw error;
  }
}

// Database-only storage - Supabase is the single source of truth
export const storage = new DatabaseStorage();

// Initialize database tables on startup (non-blocking)
let databaseReady = false;

initializeDatabase().then(() => {
  console.log("✅ Using Supabase database as single source of truth");
  databaseReady = true;
}).catch((error) => {
  console.error("❌ Database connection failed. Application will continue with database-only mode.");
  console.error("Please check DATABASE_SETUP.md for troubleshooting steps.");
  console.error("Error:", (error as Error).message);
  
  // Don't exit - let the application start and show error messages to user
});

export { databaseReady };
