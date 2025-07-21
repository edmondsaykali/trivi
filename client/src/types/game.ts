export interface Question {
  text: string;
  type: 'multipleChoice' | 'integer';
  options?: string[];
  correct: number;
  category: string;
}

export interface Player {
  id: number;
  gameId: number;
  name: string;
  avatar: string;
  score: number;
  sessionId: string;
}

export interface Game {
  id: number;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  creatorId: number;
  winnerId?: number;
  currentRound?: number;
  currentQuestion?: number;
  questionData?: Question;
  questionDeadline?: string;
  lastRoundWinnerId?: number;
  waitingForAnswers: boolean;
}

export interface GameState {
  game: Game;
  players: Player[];
  rounds: any[];
}
