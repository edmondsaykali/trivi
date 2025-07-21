import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

import { useGameState } from '@/hooks/use-game-state';
import { useQuery } from '@tanstack/react-query';
import { Home, Trophy, Target, CheckCircle, XCircle } from 'lucide-react';

interface ResultsProps {
  params: { id: string };
}

interface GameHistory {
  round: number;
  question: number;
  questionText: string;
  questionType: 'multiple_choice' | 'integer';
  correctAnswer: string;
  options?: string[];
  player1Answer: string;
  player2Answer: string;
  player1Correct: boolean;
  player2Correct: boolean;
  roundWinner?: number;
}

export default function Results({ params }: ResultsProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading } = useGameState(gameId);
  const [, setLocation] = useLocation();
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== sessionId);

  // Fetch all game answers for history
  const { data: allAnswers = [] } = useQuery<any[]>({
    queryKey: [`/api/games/${gameId}/answers`],
    enabled: !!gameId && gameState?.game.status === 'finished'
  });

  useEffect(() => {
    if (gameState && gameState.game.status !== 'finished' && gameState.game.status !== 'showing_results') {
      setLocation(`/game/${gameId}`);
    }
  }, [gameState?.game.status, gameId, setLocation]);

  // Build game history from answers
  useEffect(() => {
    if (allAnswers.length > 0 && gameState) {
      const history: GameHistory[] = [];
      
      // Group answers by round and question
      const groupedAnswers: Record<string, any[]> = {};
      allAnswers.forEach(answer => {
        const key = `${answer.round}-${answer.question}`;
        if (!groupedAnswers[key]) groupedAnswers[key] = [];
        groupedAnswers[key].push(answer);
      });

      // Process each question
      Object.entries(groupedAnswers).forEach(([key, answers]) => {
        const [round, question] = key.split('-').map(Number);
        const isMultipleChoice = question === 1;
        
        // Find answers for both players
        const player1Answer = answers.find(a => a.playerId === currentPlayer?.id);
        const player2Answer = answers.find(a => a.playerId === opponent?.id);
        
        // Create history entry
        history.push({
          round,
          question,
          questionText: `Round ${round} - Question ${question}`,
          questionType: isMultipleChoice ? 'multiple_choice' : 'integer',
          correctAnswer: 'Unknown', // We don't have this stored yet
          player1Answer: player1Answer?.answer || 'no_answer',
          player2Answer: player2Answer?.answer || 'no_answer',
          player1Correct: false, // Will be determined by game logic
          player2Correct: false,
          roundWinner: undefined
        });
      });

      // Sort by round and question
      history.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.question - b.question;
      });

      setGameHistory(history);
    }
  }, [allAnswers, gameState, currentPlayer, opponent]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const returnToLanding = () => {
    sessionStorage.removeItem('trivi-session');
    sessionStorage.removeItem('trivi-game-id');
    setLocation('/');
  };

  if (loading) {
    return null; // Don't show loading screen
  }

  if (!gameState || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Game not found</p>
          <Button onClick={returnToLanding} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { game } = gameState;
  const winner = game.winnerId ? gameState.players.find(p => p.id === game.winnerId) : null;
  const isWinner = currentPlayer.id === game.winnerId;
  const isDraw = !game.winnerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Header with Home Button */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={returnToLanding}
            className="p-2"
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>

        {/* Winner Celebration */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto shadow-lg">
            {isDraw ? (
              <div className="text-white text-4xl">🤝</div>
            ) : isWinner ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <Target className="w-12 h-12 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {isDraw ? "It's a Draw!" : isWinner ? 'Victory!' : 'Game Over'}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isDraw ? "Great game! Both players showed excellent skills." : 
               isWinner ? `Congratulations ${currentPlayer.name}! You won!` : 
               `${winner?.name} wins this round!`}
            </p>
          </div>
        </div>

        {/* Final Scores */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Final Score</h2>
          <div className="flex justify-center items-center space-x-12">
            {/* Current Player */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                isWinner ? 'bg-gradient-to-br from-primary to-primary/80' : 'bg-muted'
              }`}>
                <span className={`text-2xl font-bold ${isWinner ? 'text-white' : 'text-muted-foreground'}`}>
                  {currentPlayer.score}
                </span>
              </div>
              <div className="mt-3">
                <p className="font-semibold text-foreground">{currentPlayer.name}</p>
                <p className={`text-sm ${isWinner ? 'text-primary' : 'text-muted-foreground'}`}>
                  {currentPlayer.score} {currentPlayer.score === 1 ? 'round' : 'rounds'} won
                </p>
              </div>
            </div>
            
            <div className="text-2xl text-muted-foreground">VS</div>
            
            {/* Opponent */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                !isDraw && !isWinner ? 'bg-gradient-to-br from-primary to-primary/80' : 'bg-muted'
              }`}>
                <span className={`text-2xl font-bold ${!isDraw && !isWinner ? 'text-white' : 'text-muted-foreground'}`}>
                  {opponent.score}
                </span>
              </div>
              <div className="mt-3">
                <p className="font-semibold text-foreground">{opponent.name}</p>
                <p className={`text-sm ${!isDraw && !isWinner ? 'text-primary' : 'text-muted-foreground'}`}>
                  {opponent.score} {opponent.score === 1 ? 'round' : 'rounds'} won
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Game History */}
        {gameHistory.length > 0 && (
          <div className="bg-card rounded-2xl p-6 shadow-lg border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Game History</h2>
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {gameHistory.map((item, idx) => {
                const currentPlayerAnswer = item.answers?.find(a => a.playerId === currentPlayer.id);
                const opponentAnswer = item.answers?.find(a => a.playerId === opponent.id);
                
                return (
                  <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">Round {item.round}</h3>
                      <span className={`text-sm font-medium ${
                        item.roundWinner === currentPlayer.id 
                          ? 'text-green-600' 
                          : item.roundWinner === opponent.id
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}>
                        {item.roundWinner === currentPlayer.id ? '✓ You Won' : 
                         item.roundWinner === opponent.id ? `✓ ${opponent.name} Won` : 
                         '— Draw'}
                      </span>
                    </div>
                    
                    {/* Question */}
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Question:</span> {item.questionText || 'Question not available'}
                    </div>
                    
                    {/* Answers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{currentPlayer.name}</span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          currentPlayerAnswer?.answer === 'no_answer' 
                            ? 'bg-gray-100 text-gray-600' 
                            : item.roundWinner === currentPlayer.id
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {currentPlayerAnswer?.answer === 'no_answer' ? 'No answer' : currentPlayerAnswer?.answer || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{opponent.name}</span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          opponentAnswer?.answer === 'no_answer' 
                            ? 'bg-gray-100 text-gray-600' 
                            : item.roundWinner === opponent.id
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {opponentAnswer?.answer === 'no_answer' ? 'No answer' : opponentAnswer?.answer || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button onClick={returnToLanding} size="lg" className="px-8">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
}