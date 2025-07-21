import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, databaseReady } from "./storage";
import { insertGameSchema, insertPlayerSchema, insertAnswerSchema } from "@shared/schema";
import { z } from "zod";

// Expanded questions pool for engaging trivia gameplay
const QUESTIONS_POOL = {
  multipleChoice: [
    {
      text: "Which planet is known as the 'Red Planet'?",
      options: ["Earth", "Mars", "Jupiter", "Venus"],
      correct: 1,
      category: "Science"
    },
    {
      text: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2,
      category: "Geography"
    },
    {
      text: "Who painted the Mona Lisa?",
      options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
      correct: 1,
      category: "Art"
    },
    {
      text: "What is the largest ocean on Earth?",
      options: ["Atlantic", "Indian", "Arctic", "Pacific"],
      correct: 3,
      category: "Geography"
    },
    {
      text: "Which element has the chemical symbol 'O'?",
      options: ["Gold", "Oxygen", "Silver", "Iron"],
      correct: 1,
      category: "Science"
    },
    {
      text: "What is the smallest country in the world?",
      options: ["Monaco", "Vatican City", "Nauru", "San Marino"],
      correct: 1,
      category: "Geography"
    },
    {
      text: "Who wrote 'Romeo and Juliet'?",
      options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
      correct: 1,
      category: "Literature"
    },
    {
      text: "What is the hardest natural substance on Earth?",
      options: ["Gold", "Iron", "Diamond", "Quartz"],
      correct: 2,
      category: "Science"
    },
    {
      text: "Which country invented pizza?",
      options: ["France", "Italy", "Greece", "Spain"],
      correct: 1,
      category: "Food"
    },
    {
      text: "What is the largest mammal in the world?",
      options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
      correct: 1,
      category: "Animals"
    }
  ],
  integer: [
    {
      text: "How many countries are there in Europe?",
      correct: 44,
      category: "Geography"
    },
    {
      text: "In what year did World War II end?",
      correct: 1945,
      category: "History"
    },
    {
      text: "How many bones are in the adult human body?",
      correct: 206,
      category: "Science"
    },
    {
      text: "What is the speed of light in km/s (rounded to nearest thousand)?",
      correct: 300000,
      category: "Science"
    },
    {
      text: "How many players are on a basketball team on the court at one time?",
      correct: 5,
      category: "Sports"
    },
    {
      text: "How many strings does a standard guitar have?",
      correct: 6,
      category: "Music"
    },
    {
      text: "How many sides does a hexagon have?",
      correct: 6,
      category: "Math"
    },
    {
      text: "In what year was the iPhone first released?",
      correct: 2007,
      category: "Technology"
    },
    {
      text: "How many minutes are in a full day?",
      correct: 1440,
      category: "Math"
    },
    {
      text: "How many continents are there?",
      correct: 7,
      category: "Geography"
    }
  ]
};

function generateGameCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getRandomAvatar(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  const shapes = ['circle', 'square', 'hexagon', 'triangle'];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  
  // Generate SVG avatar as data URL
  const svg = `
    <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="150" fill="${color.replace('#', '%23')}" opacity="0.1"/>
      ${shape === 'circle' ? `<circle cx="75" cy="75" r="40" fill="${color.replace('#', '%23')}"/>` :
        shape === 'square' ? `<rect x="35" y="35" width="80" height="80" fill="${color.replace('#', '%23')}"/>` :
        shape === 'hexagon' ? `<polygon points="75,35 110,55 110,95 75,115 40,95 40,55" fill="${color.replace('#', '%23')}"/>` :
        `<polygon points="75,35 105,95 45,95" fill="${color.replace('#', '%23')}"/>`}
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function getRandomQuestion(type: 'multiple_choice' | 'integer') {
  // Try to get question from Supabase
  const question = await storage.getRandomQuestionByType(type);
  if (question) {
    return {
      text: question.text,
      options: question.options as string[] || undefined,
      correct: question.correctAnswer,
      category: question.category,
      type: question.type
    };
  }
  
  // Fallback to hardcoded questions if database is unavailable
  const typeMapping = { 'multiple_choice': 'multipleChoice', 'integer': 'integer' } as const;
  const pool = QUESTIONS_POOL[typeMapping[type]];
  const fallbackQuestion = pool[Math.floor(Math.random() * pool.length)];
  
  // Ensure the type field is properly set for fallback questions
  return {
    ...fallbackQuestion,
    type
  };
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// COMPLETELY REWRITTEN GAME LOGIC - Clean, robust implementation
async function processGame(gameId: number) {
  console.log(`=== PROCESSING GAME ${gameId} ===`);
  
  const game = await storage.getGameById(gameId);
  if (!game || !game.questionData || game.status !== 'playing') {
    console.log(`Skipping processing: invalid game state`);
    return;
  }

  // Prevent concurrent processing
  if (game.waitingForAnswers) {
    console.log(`Already processing game ${gameId}`);
    return;
  }

  await storage.updateGame(gameId, { waitingForAnswers: true });

  const { currentRound, currentQuestion } = game;
  const answers = await storage.getAnswersByGameRound(gameId, currentRound!, currentQuestion!);
  const players = await storage.getPlayersByGameId(gameId);
  
  console.log(`Game ${gameId} R${currentRound}Q${currentQuestion}: ${answers.length}/2 answers received`);

  if (players.length !== 2) {
    console.error(`Game ${gameId} needs 2 players, has ${players.length}`);
    return;
  }

  const timeRemaining = game.questionDeadline ? new Date(game.questionDeadline).getTime() - Date.now() : 0;
  const timeIsUp = timeRemaining <= 0;

  // Core decision logic
  let roundWinner: number | null = null;
  let shouldContinueToQ2 = false;
  let gameComplete = false;

  if (currentQuestion === 1) {
    // QUESTION 1: Multiple Choice
    const result = evaluateMultipleChoice(game.questionData, answers);
    console.log(`Q1 result: ${result.correctCount} correct answers`);
    
    if (result.correctCount === 1) {
      roundWinner = result.winner!;
      gameComplete = true;
      console.log(`Q1 decisive: Player ${roundWinner} wins immediately`);
    } else if (answers.length === 2 || timeIsUp) {
      shouldContinueToQ2 = true;
      console.log(`Q1 tied: Moving to Q2`);
    } else {
      console.log(`Q1 waiting: ${2 - answers.length} more answers needed`);
      await storage.updateGame(gameId, { waitingForAnswers: false });
      return;
    }
  } else if (currentQuestion === 2) {
    // QUESTION 2: Integer
    if (answers.length < 2 && !timeIsUp) {
      console.log(`Q2 waiting: ${2 - answers.length} more answers needed, ${Math.max(0, timeRemaining)}ms remaining`);
      await storage.updateGame(gameId, { waitingForAnswers: false });
      return;
    }

    const result = evaluateIntegerQuestion(game.questionData, answers);
    roundWinner = result.winner;
    gameComplete = true;
    console.log(`Q2 result: Player ${roundWinner || 'none'} wins`);
  }

  // Execute decision
  if (shouldContinueToQ2) {
    console.log(`Advancing to Q2 in 2 seconds...`);
    setTimeout(async () => {
      await startQuestion(gameId, currentRound!, 2);
    }, 2000);
  } else if (gameComplete) {
    await finishGame(gameId, roundWinner);
  }

  await storage.updateGame(gameId, { 
    waitingForAnswers: false,
    lastRoundWinnerId: roundWinner 
  });
}

function evaluateMultipleChoice(questionData: any, answers: any[]): { correctCount: number, winner: number | null } {
  const correctIndex = questionData.options?.findIndex((opt: string) => opt === questionData.correct) ?? -1;
  const correctAnswers = answers.filter(a => parseInt(a.answer) === correctIndex);
  
  return {
    correctCount: correctAnswers.length,
    winner: correctAnswers.length === 1 ? correctAnswers[0].playerId : null
  };
}

function evaluateIntegerQuestion(questionData: any, answers: any[]): { winner: number | null } {
  if (answers.length === 0) return { winner: null };
  if (answers.length === 1) return { winner: answers[0].playerId };

  const correctAnswer = questionData.correct;
  const exactMatches = answers.filter(a => parseInt(a.answer) === correctAnswer);

  if (exactMatches.length === 1) {
    return { winner: exactMatches[0].playerId };
  } else if (exactMatches.length === 2) {
    // Both correct - fastest wins
    exactMatches.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    return { winner: exactMatches[0].playerId };
  } else {
    // Both wrong - closest wins
    const withDistance = answers.map(a => ({
      ...a,
      distance: Math.abs(parseInt(a.answer) - correctAnswer)
    }));
    
    withDistance.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
    
    return { winner: withDistance[0].playerId };
  }
}

async function finishGame(gameId: number, winnerId: number | null) {
  console.log(`Finishing game ${gameId}, winner: ${winnerId || 'none'}`);
  
  if (winnerId) {
    const winner = await storage.getPlayerById(winnerId);
    if (winner) {
      const newScore = (winner.score || 0) + 1;
      await storage.updatePlayerScore(winnerId, newScore);
      console.log(`${winner.name} wins with score: ${newScore}`);
    }
  }

  setTimeout(async () => {
    await storage.updateGame(gameId, {
      status: "finished",
      winnerId,
      waitingForAnswers: false
    });
    console.log(`Game ${gameId} officially finished`);
  }, 3000);
}

async function startQuestion(gameId: number, round: number, question: number) {
  console.log(`=== STARTING R${round}Q${question} ===`);
  
  const questionType = question === 1 ? 'multiple_choice' : 'integer';
  const questionData = await getRandomQuestion(questionType);
  const deadline = new Date(Date.now() + 15000);
  
  await storage.updateGame(gameId, {
    status: 'playing',
    currentRound: round,
    currentQuestion: question,
    questionData,
    questionDeadline: deadline,
    waitingForAnswers: false,
    lastRoundWinnerId: null
  });

  console.log(`Q${question} started: "${questionData.text}"`);

  // Auto-process when time expires
  setTimeout(async () => {
    console.log(`Time's up for R${round}Q${question}`);
    await processGame(gameId);
  }, 15000);
}

// Legacy function name compatibility
async function processRound(gameId: number, round: number, question: number) {
  await processGame(gameId);
}

// Update the start game function to use new logic
async function startNextQuestion(gameId: number, round: number, question: number) {
  await startQuestion(gameId, round, question);
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create game
  app.post("/api/games", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const sessionId = generateSessionId();
      const code = generateGameCode();
      
      const game = await storage.createGame({
        code,
        status: "waiting",
        creatorId: 0, // Will be updated after player creation
        winnerId: null,
        currentRound: 1,
        currentQuestion: 1,
        questionData: null,
        questionDeadline: null,
        lastRoundWinnerId: null,
        waitingForAnswers: false,
      });
      
      const player = await storage.createPlayer({
        gameId: game.id,
        name,
        avatar: getRandomAvatar(),
        score: 0,
        sessionId,
      });
      
      // Update game with creator
      await storage.updateGame(game.id, { creatorId: player.id });
      
      res.json({ 
        game: { ...game, creatorId: player.id }, 
        player,
        sessionId 
      });
    } catch (error) {
      console.error("Error creating game:", error);
      
      // Provide specific error messages for database connectivity issues
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ENOTFOUND')) {
        res.status(503).json({ 
          message: "Database connection failed. Please check DATABASE_SETUP.md for troubleshooting steps.",
          details: "Network connectivity issue with Supabase database"
        });
      } else {
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });
  
  // Join game
  app.post("/api/games/join", async (req, res) => {
    try {
      const { code, name } = req.body;
      if (!code || !name) {
        return res.status(400).json({ message: "Code and name are required" });
      }
      
      const game = await storage.getGameByCode(code);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      if (game.status !== "waiting") {
        return res.status(400).json({ message: "Game already started" });
      }
      
      const existingPlayers = await storage.getPlayersByGameId(game.id);
      if (existingPlayers.length >= 2) {
        return res.status(400).json({ message: "Game is full" });
      }
      
      const sessionId = generateSessionId();
      const player = await storage.createPlayer({
        gameId: game.id,
        name,
        avatar: getRandomAvatar(),
        score: 0,
        sessionId,
      });
      
      res.json({ game, player, sessionId });
    } catch (error) {
      console.error("Error joining game:", error);
      res.status(500).json({ message: "Failed to join game" });
    }
  });
  
  // Start game
  app.post("/api/games/:id/start", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      const players = await storage.getPlayersByGameId(gameId);
      if (players.length !== 2) {
        return res.status(400).json({ message: "Need 2 players to start" });
      }
      
      await startQuestion(gameId, 1, 1);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: "Failed to start game" });
    }
  });
  
  // Get answers for a specific round/question (for results display)
  app.get("/api/games/:id/answers", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { round, question } = req.query;
      
      if (!round || !question) {
        return res.status(400).json({ message: "Round and question parameters required" });
      }
      
      const answers = await storage.getAnswersByGameRound(
        gameId, 
        parseInt(round as string), 
        parseInt(question as string)
      );
      
      res.json(answers);
    } catch (error) {
      console.error("Error getting answers:", error);
      res.status(500).json({ message: "Failed to get answers" });
    }
  });

  // Submit answer
  app.post("/api/games/:id/answer", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { answer, sessionId } = req.body;
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Check deadline
      if (game.questionDeadline && new Date() > new Date(game.questionDeadline)) {
        return res.status(400).json({ message: "Time's up!" });
      }
      
      const players = await storage.getPlayersByGameId(gameId);
      const player = players.find(p => p.sessionId === sessionId);
      if (!player) {
        return res.status(403).json({ message: "Invalid session" });
      }
      
      // Check if already answered
      const existingAnswers = await storage.getAnswersByGameRound(
        gameId, 
        game.currentRound!, 
        game.currentQuestion!
      );
      if (existingAnswers.some(a => a.playerId === player.id)) {
        return res.status(400).json({ message: "Already answered" });
      }
      
      const answerRecord = await storage.createAnswer({
        gameId,
        playerId: player.id,
        round: game.currentRound!,
        question: game.currentQuestion!,
        answer: answer.toString(),
      });
      
      // Check if this completes the round
      const allAnswers = await storage.getAnswersByGameRound(
        gameId,
        game.currentRound!,
        game.currentQuestion!
      );
      
      // Always trigger processing to check if we should proceed
      console.log(`Answer submitted: ${answer} for round ${game.currentRound}, question ${game.currentQuestion}`);
      // Prevent duplicate processing by checking if we're already processing
      const updatedGame = await storage.getGameById(gameId);
      if (!updatedGame?.waitingForAnswers) {
        setTimeout(() => processRound(gameId, game.currentRound!, game.currentQuestion!), 100);
      }
      
      res.json({ success: true, answer: answerRecord });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });
  
  // Debug: Manually trigger processing for stuck games
  app.post("/api/games/:id/process", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      console.log(`Manual processing trigger for game ${gameId}`);
      await processRound(gameId, game.currentRound!, game.currentQuestion!);
      
      res.json({ success: true, message: "Processing triggered" });
    } catch (error) {
      console.error("Error triggering processing:", error);
      res.status(500).json({ message: "Failed to trigger processing" });
    }
  });

  // Leave game (for disconnection handling)
  app.post("/api/games/:id/leave", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      // Remove player from game
      await storage.removePlayerFromGame(gameId, sessionId);
      
      res.json({ message: "Left game successfully" });
    } catch (error) {
      console.error("Error leaving game:", error);
      res.status(500).json({ message: "Failed to leave game" });
    }
  });

  // Heartbeat endpoint to detect player disconnections
  app.post("/api/games/:id/heartbeat", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      // Update player's last seen timestamp
      await storage.updatePlayerHeartbeat(sessionId);
      
      res.json({ message: "Heartbeat received" });
    } catch (error) {
      console.error("Error updating heartbeat:", error);
      res.status(500).json({ message: "Failed to update heartbeat" });
    }
  });

  // Get game state
  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      const players = await storage.getPlayersByGameId(gameId);
      const rounds = await storage.getRoundsByGameId(gameId);
      
      res.json({ game, players, rounds });
    } catch (error) {
      console.error("Error getting game:", error);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
