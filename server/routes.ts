import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  const avatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1494790108755-2616b9d884c0?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1?w=150&h=150&fit=crop&crop=face"
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

function getRandomQuestion(type: 'multipleChoice' | 'integer') {
  const pool = QUESTIONS_POOL[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function processRound(gameId: number, round: number, question: number) {
  const answers = await storage.getAnswersByGameRound(gameId, round, question);
  if (answers.length !== 2) return; // Wait for both players
  
  const game = await storage.getGameById(gameId);
  if (!game || !game.questionData) return;
  
  const players = await storage.getPlayersByGameId(gameId);
  let winnerId: number | null = null;
  
  // Determine winner based on question type
  const questionData = game.questionData as any;
  if (questionData?.type === 'multipleChoice') {
    const correctAnswers = answers.filter(a => parseInt(a.answer) === questionData.correct);
    
    if (correctAnswers.length === 1) {
      winnerId = correctAnswers[0].playerId;
    } else if (correctAnswers.length === 2) {
      // Both correct, fastest wins
      winnerId = correctAnswers.sort((a, b) => 
        new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime()
      )[0].playerId;
    } else {
      // Both wrong, no winner this question, move to question 2
      if (question === 1) {
        await startNextQuestion(gameId, round, 2);
        return;
      }
    }
  } else if (questionData?.type === 'integer') {
    const correctAnswer = questionData.correct;
    const exactCorrect = answers.filter(a => parseInt(a.answer) === correctAnswer);
    
    if (exactCorrect.length === 1) {
      winnerId = exactCorrect[0].playerId;
    } else if (exactCorrect.length === 2) {
      // Both exact, fastest wins
      winnerId = exactCorrect.sort((a, b) => 
        new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime()
      )[0].playerId;
    } else {
      // Neither exact, closest wins
      const withDistance = answers.map(a => ({
        ...a,
        distance: Math.abs(parseInt(a.answer) - correctAnswer)
      }));
      
      withDistance.sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime();
      });
      
      winnerId = withDistance[0].playerId;
    }
  }
  
  if (winnerId) {
    // Update winner's score
    const winner = await storage.getPlayerById(winnerId);
    if (winner) {
      await storage.updatePlayerScore(winnerId, (winner.score || 0) + 1);
      
      // Update game state
      await storage.updateGame(gameId, {
        lastRoundWinnerId: winnerId,
        waitingForAnswers: true
      });
      
      // Check if game is won (first to 5)
      if ((winner.score || 0) + 1 >= 5) {
        await storage.updateGame(gameId, {
          status: "finished",
          winnerId: winnerId
        });
        return;
      }
      
      // Move to next round after 3 seconds
      setTimeout(async () => {
        await startNextQuestion(gameId, round + 1, 1);
      }, 3000);
    }
  }
}

async function startNextQuestion(gameId: number, round: number, question: number) {
  let questionData;
  
  if (question === 1) {
    questionData = { ...getRandomQuestion('multipleChoice'), type: 'multipleChoice' };
  } else {
    questionData = { ...getRandomQuestion('integer'), type: 'integer' };
  }
  
  const deadline = new Date(Date.now() + 15000); // 15 seconds
  
  await storage.updateGame(gameId, {
    currentRound: round,
    currentQuestion: question,
    questionData,
    questionDeadline: deadline,
    waitingForAnswers: false,
    lastRoundWinnerId: null
  });
  
  // Auto-process after deadline
  setTimeout(async () => {
    await processRound(gameId, round, question);
  }, 15100);
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
      res.status(500).json({ message: "Failed to create game" });
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
      
      await startNextQuestion(gameId, 1, 1);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: "Failed to start game" });
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
      
      if (allAnswers.length === 2) {
        setTimeout(() => processRound(gameId, game.currentRound!, game.currentQuestion!), 100);
      }
      
      res.json({ success: true, answer: answerRecord });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
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
