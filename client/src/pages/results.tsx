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

  // Build game history from answers with actual answer values
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
        
        // Get the question text and correct answer from stored data
        const questionText = player1Answer?.questionText || player2Answer?.questionText || `Question ${question}`;
        const correctAnswer = player1Answer?.correctAnswer || player2Answer?.correctAnswer || 'Unknown';
        
        // Get user answers - they should already be stored as text values in the database
        const player1DisplayAnswer = player1Answer?.answer || 'no_answer';
        const player2DisplayAnswer = player2Answer?.answer || 'no_answer';
        
        history.push({
          round,
          question,
          questionText,
          questionType: isMultipleChoice ? 'multiple_choice' : 'integer',
          correctAnswer,
          player1Answer: player1DisplayAnswer,
          player2Answer: player2DisplayAnswer,
          player1Correct: player1Answer?.isCorrect || false,
          player2Correct: player2Answer?.isCorrect || false
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
      <div className="max-w-4xl mx-auto space-y-8 py-4">

        {/* Winner Celebration */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-orange-500 mb-2">
              {isDraw ? "It's a Draw!" : isWinner ? 'Victory' : 'Game Over'}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isDraw ? "Great game! Both players showed excellent skills." : 
               isWinner ? `Congratulations ${currentPlayer.name}, you won!` : 
               `${winner?.name} wins this round!`}
            </p>
          </div>
        </div>

        {/* Final Scores - No Box */}
        <div className="flex justify-center items-center space-x-8">
          {/* Current Player */}
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">{currentPlayer.name}</p>
            <p className="text-sm text-muted-foreground">
              {currentPlayer.score} {currentPlayer.score === 1 ? 'round' : 'rounds'} won
            </p>
          </div>
          
          <div className="text-2xl text-muted-foreground">VS</div>
          
          {/* Opponent */}
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">{opponent.name}</p>
            <p className="text-sm text-muted-foreground">
              {opponent.score} {opponent.score === 1 ? 'round' : 'rounds'} won
            </p>
          </div>
        </div>

        {/* Game History - Single Box */}
        {gameHistory.length > 0 && (
          <div className="bg-card rounded-2xl p-6 shadow-lg border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Game History</h2>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {gameHistory.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  {/* Question */}
                  <div className="text-sm font-medium text-foreground">
                    {item.questionText}
                  </div>
                  
                  {/* Show correct answer */}
                  <div className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium">Correct Answer:</span> <span className="text-green-600">{item.correctAnswer}</span>
                  </div>
                  
                  {/* Players' answers */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{currentPlayer.name}:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.player1Answer === 'no_answer' 
                          ? 'bg-gray-100 text-gray-600' 
                          : item.player1Correct
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.player1Answer === 'no_answer' ? 'No answer' : item.player1Answer}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{opponent.name}:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.player2Answer === 'no_answer' 
                          ? 'bg-gray-100 text-gray-600' 
                          : item.player2Correct
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.player2Answer === 'no_answer' ? 'No answer' : item.player2Answer}
                      </span>
                    </div>
                  </div>
                  
                  {/* Separator line except for last item */}
                  {idx < gameHistory.length - 1 && <hr className="border-border mt-3" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Home Button */}
        <div className="flex justify-center">
          <Button onClick={returnToLanding} size="lg" className="px-8">
            Back Home
          </Button>
        </div>
      </div>
    </div>
  );
}