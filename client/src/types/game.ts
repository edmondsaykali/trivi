export interface Question {
  text: string;
  type: 'multiple_choice' | 'integer';
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
  status: 'waiting' | 'playing' | 'showing_results' | 'finished';
  createdAt: string;
  creatorId: number;
  winnerId?: number;
  currentRound?: number;
  currentQuestion?: number;
  questionData?: Question;
  questionDeadline?: string;
  lastRoundWinnerId?: number;
  waitingForAnswers: boolean;
  allRoundQuestions?: any;
}

export interface GameState {
  game: Game;
  players: Player[];
  rounds: any[];
}
