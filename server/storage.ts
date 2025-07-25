import { games, players, answers, rounds, questions, type Game, type Player, type Answer, type Round, type Question, type InsertGame, type InsertPlayer, type InsertAnswer, type InsertRound } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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
  removePlayerFromGame(gameId: number, sessionId: string): Promise<boolean>;
  updatePlayerHeartbeat(sessionId: string): Promise<boolean>;
  cleanupStalePlayers(): Promise<void>;
  
  // Answers
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByGameRound(gameId: number, round: number, question: number): Promise<Answer[]>;
  getAnswersForQuestion(gameId: number, round: number, question: number): Promise<Answer[]>;
  
  // Rounds
  createRound(round: InsertRound): Promise<Round>;
  getRoundsByGameId(gameId: number): Promise<Round[]>;
  updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined>;
  
  // Questions
  getRandomQuestionByType(type: string, excludeIds?: number[]): Promise<Question | undefined>;
  
  // Game state
  getGameState(id: number): Promise<any>;
  addPlayerToGame(gameId: number, player: InsertPlayer): Promise<Player>;
  submitAnswer(answer: InsertAnswer): Promise<void>;
  getAnswersForRound(gameId: number, round: number, question: number): Promise<Answer[]>;
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
      usedQuestions: insertGame.usedQuestions || [],
      categoryProgress: insertGame.categoryProgress || {},
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

  async removePlayerFromGame(gameId: number, sessionId: string): Promise<boolean> {
    // Only remove players from games that haven't started yet
    const game = await this.getGameById(gameId);
    if (game && game.status === 'waiting') {
      for (const [id, player] of Array.from(this.players.entries())) {
        if (player.gameId === gameId && player.sessionId === sessionId) {
          this.players.delete(id);
          return true;
        }
      }
    }
    return false;
  }

  async updatePlayerHeartbeat(sessionId: string): Promise<boolean> {
    // For in-memory storage, just return true - no persistence needed
    return true;
  }

  async cleanupStalePlayers(): Promise<void> {
    // In-memory storage doesn't need cleanup
    return;
  }

  // Game state
  async getGameState(id: number): Promise<any> {
    const game = await this.getGameById(id);
    if (!game) return null;
    
    const players = await this.getPlayersByGameId(id);
    const rounds = await this.getRoundsByGameId(id);
    
    return { game, players, rounds };
  }

  async addPlayerToGame(gameId: number, player: InsertPlayer): Promise<Player> {
    return this.createPlayer(player);
  }

  async submitAnswer(answer: InsertAnswer): Promise<void> {
    await this.createAnswer(answer);
  }

  async getAnswersForRound(gameId: number, round: number, question: number): Promise<Answer[]> {
    return this.getAnswersByGameRound(gameId, round, question);
  }

  // Answers
  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = this.currentAnswerId++;
    const answer: Answer = {
      ...insertAnswer,
      id,
      submittedAt: new Date(),
      isCorrect: null,
      questionId: insertAnswer.questionId || null,
      questionText: insertAnswer.questionText || null,
      correctAnswer: insertAnswer.correctAnswer || null,
    };
    this.answers.set(id, answer);
    return answer;
  }

  async getAnswersByGameRound(gameId: number, round: number, question: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      answer => answer.gameId === gameId && answer.round === round && answer.question === question
    );
  }
  
  async getAnswersForQuestion(gameId: number, round: number, question: number): Promise<Answer[]> {
    return this.getAnswersByGameRound(gameId, round, question);
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

  // Questions - Hardcoded questions for in-memory storage
  async getRandomQuestionByType(type: string, excludeIds: number[] = []): Promise<Question | undefined> {
    const hardcodedQuestions: Question[] = [
      // Multiple choice questions
      {
        id: 1,
        text: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        category: "Geography",
        type: "multiple_choice",
        createdAt: new Date()
      },
      {
        id: 2,
        text: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctAnswer: "Mars",
        category: "Science",
        type: "multiple_choice",
        createdAt: new Date()
      },
      {
        id: 3,
        text: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
        correctAnswer: "Leonardo da Vinci",
        category: "Art",
        type: "multiple_choice",
        createdAt: new Date()
      },
      {
        id: 4,
        text: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correctAnswer: "Pacific Ocean",
        category: "Geography",
        type: "multiple_choice",
        createdAt: new Date()
      },
      {
        id: 5,
        text: "Which element has the chemical symbol 'O'?",
        options: ["Gold", "Oxygen", "Silver", "Iron"],
        correctAnswer: "Oxygen",
        category: "Science",
        type: "multiple_choice",
        createdAt: new Date()
      },
      // Integer questions
      {
        id: 101,
        text: "How many continents are there?",
        options: null,
        correctAnswer: "7",
        category: "Geography",
        type: "input_based",
        createdAt: new Date()
      },
      {
        id: 102,
        text: "In what year did World War II end?",
        options: null,
        correctAnswer: "1945",
        category: "History",
        type: "input_based",
        createdAt: new Date()
      },
      {
        id: 103,
        text: "How many sides does a hexagon have?",
        options: null,
        correctAnswer: "6",
        category: "Mathematics",
        type: "input_based",
        createdAt: new Date()
      },
      {
        id: 104,
        text: "What is the freezing point of water in Celsius?",
        options: null,
        correctAnswer: "0",
        category: "Science",
        type: "input_based",
        createdAt: new Date()
      },
      {
        id: 105,
        text: "How many players are on a basketball team on the court at one time?",
        options: null,
        correctAnswer: "5",
        category: "Sports",
        type: "input_based",
        createdAt: new Date()
      }
    ];

    const questionsOfType = hardcodedQuestions.filter(q => q.type === type);
    const availableQuestions = questionsOfType.filter(q => !excludeIds.includes(q.id));
    
    if (availableQuestions.length === 0) {
      // If no unused questions, return from all questions of that type
      return questionsOfType.length > 0 ? questionsOfType[Math.floor(Math.random() * questionsOfType.length)] : undefined;
    }
    
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle<any>>;
  private sql: ReturnType<typeof postgres>;
  
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Initialize with postgres.js for WebContainer compatibility
    this.sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    this.db = drizzle(this.sql);
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

  async removePlayerFromGame(gameId: number, sessionId: string): Promise<boolean> {
    // Only remove players from games that haven't started yet
    const game = await this.getGameById(gameId);
    if (game && game.status === 'waiting') {
      const result = await this.db.delete(players)
        .where(and(eq(players.gameId, gameId), eq(players.sessionId, sessionId)));
      return true;
    }
    return false;
  }

  async updatePlayerHeartbeat(sessionId: string): Promise<boolean> {
    // For now, just return true as we don't track heartbeats in the database yet
    // In a production app, you'd have a lastSeen timestamp field
    return true;
  }

  async cleanupStalePlayers(): Promise<void> {
    // Database storage doesn't need cleanup in this implementation
    return;
  }

  // Game state
  async getGameState(id: number): Promise<any> {
    const game = await this.getGameById(id);
    if (!game) return null;
    
    const players = await this.getPlayersByGameId(id);
    const rounds = await this.getRoundsByGameId(id);
    
    return { game, players, rounds };
  }

  async addPlayerToGame(gameId: number, player: InsertPlayer): Promise<Player> {
    return this.createPlayer(player);
  }

  async submitAnswer(answer: InsertAnswer): Promise<void> {
    await this.createAnswer(answer);
  }

  async getAnswersForRound(gameId: number, round: number, question: number): Promise<Answer[]> {
    return this.getAnswersByGameRound(gameId, round, question);
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
  
  async getAnswersForQuestion(gameId: number, round: number, question: number): Promise<Answer[]> {
    return this.getAnswersByGameRound(gameId, round, question);
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

  // Questions
  async getRandomQuestionByType(type: string, excludeIds: number[] = []): Promise<Question | undefined> {
    console.log(`Querying database for type: ${type}`);
    const result = await this.db.select().from(questions).where(eq(questions.type, type));
    console.log(`Found ${result.length} questions of type ${type}`);
    
    if (result.length === 0) {
      console.error(`No questions found for type: ${type}`);
      return undefined;
    }
    
    // Filter out already used questions
    const availableQuestions = result.filter(q => !excludeIds.includes(q.id));
    console.log(`Available questions after filtering: ${availableQuestions.length}`);
    
    // If no unused questions available, reset and use all questions again
    if (availableQuestions.length === 0) {
      console.log('No unused questions, selecting from all questions');
      return result[Math.floor(Math.random() * result.length)];
    }
    
    const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    console.log(`Selected question ID: ${selected.id}`);
    return selected;
  }
}

// Initialize database tables
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required - this application requires a Supabase database connection");
  }

  try {
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
    });
    
    const db = drizzle(sql);
    
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
        waiting_for_answers BOOLEAN DEFAULT false,
        used_questions JSONB DEFAULT '[]'::jsonb,
        category_progress JSONB DEFAULT '{}'::jsonb
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
        is_correct BOOLEAN,
        question_id TEXT,
        question_text TEXT,
        correct_answer TEXT
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

    // Add missing columns to existing games table
    await sql`ALTER TABLE games ADD COLUMN IF NOT EXISTS used_questions JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE games ADD COLUMN IF NOT EXISTS category_progress JSONB DEFAULT '{}'::jsonb`;
    
    // Add missing columns to existing answers table
    await sql`ALTER TABLE answers ADD COLUMN IF NOT EXISTS question_id TEXT`;
    await sql`ALTER TABLE answers ADD COLUMN IF NOT EXISTS question_text TEXT`;
    await sql`ALTER TABLE answers ADD COLUMN IF NOT EXISTS correct_answer TEXT`;

    await sql.end();

    console.log("✅ Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", (error as Error).message);
    throw error;
  }
}

// Initialize storage based on environment
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    try {
      return new DatabaseStorage();
    } catch (error) {
      console.warn("⚠️ Database connection failed, falling back to memory storage");
      console.warn("Error:", (error as Error).message);
      return new MemStorage();
    }
  } else {
    console.log("📝 Using in-memory storage (no DATABASE_URL configured)");
    return new MemStorage();
  }
}

export const storage = createStorage();

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
