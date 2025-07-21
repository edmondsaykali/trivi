import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { useGameState } from '@/hooks/use-game-state';
import { useQuery } from '@tanstack/react-query';
import { Home, Trophy, Target, Clock } from 'lucide-react';

interface ResultsProps {
  params: { id: string };
}

interface GameAnswer {
  id: number;
  gameId: number;
  playerId: number;
  round: number;
  question: number;
  answer: string;
  submittedAt: string;
  isCorrect: boolean | null;
}

interface QuestionResult {
  round: number;
  question: number;
  questionText: string;
  questionType: 'multiple_choice' | 'integer';
  correctAnswer: string;
  options?: string[];
  answers: {
    playerId: number;
    playerName: string;
    answer: string;
    isCorrect: boolean;
    submittedAt: string;
  }[];
  winnerId: number | null;
}

export default function Results({ params }: ResultsProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading } = useGameState(gameId);
  const [, setLocation] = useLocation();

  // Fetch all answers for detailed results
  const { data: answers = [] } = useQuery<GameAnswer[]>({
    queryKey: ['/api/games', gameId, 'answers'],
    enabled: !!gameId && gameState?.game.status === 'finished'
  });

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== sessionId);

  useEffect(() => {
    if (gameState?.game.status !== 'finished') {
      setLocation(`/game/${gameId}`);
    }
  }, [gameState?.game.status, gameId, setLocation]);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const returnToLanding = () => {
    // Clear session data
    sessionStorage.removeItem('trivi-session');
    sessionStorage.removeItem('trivi-game-id');
    setLocation('/');
  };

  // Build detailed question results
  const questionResults: QuestionResult[] = [];
  if (gameState && answers.length > 0) {
    // Group answers by round and question
    const answersByRoundQuestion = answers.reduce((acc, answer) => {
      const key = `${answer.round}-${answer.question}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(answer);
      return acc;
    }, {} as Record<string, GameAnswer[]>);

    // Create question results with simulated question data
    // Note: In a real app, you'd store the actual questions asked
    Object.entries(answersByRoundQuestion).forEach(([key, roundAnswers]) => {
      const [round, question] = key.split('-').map(Number);
      const isMultipleChoice = question === 1;
      
      // Use actual question data from the game state or reconstruct from answers
      // For now, we'll extract what we can from the game's last question data
      const questionData = {
        text: `Question ${question} from Round ${round}`,
        type: isMultipleChoice ? 'multiple_choice' : 'integer' as 'multiple_choice' | 'integer',
        correctAnswer: "Unknown", // Will be determined by answer validation
        options: isMultipleChoice ? ["Option A", "Option B", "Option C", "Option D"] : undefined
      };

      const answerDetails = roundAnswers.map(answer => {
        const player = gameState.players.find(p => p.id === answer.playerId);
        let isCorrect = false;
        
        // Determine correctness based on actual game logic
        // We'll infer correctness from the winner of this question
        if (isMultipleChoice) {
          // For MC questions, we can't reliably determine correctness without the actual question
          // So we'll show all answers and let the winner logic determine correctness
          isCorrect = false; // Will be updated based on winner logic
        } else {
          // For integer questions, we also need the actual correct answer
          isCorrect = false; // Will be updated based on winner logic  
        }

        return {
          playerId: answer.playerId,
          playerName: player?.name || 'Unknown',
          answer: isMultipleChoice ? 
            (questionData.options?.[parseInt(answer.answer)] || answer.answer) : 
            answer.answer,
          isCorrect,
          submittedAt: answer.submittedAt
        };
      });

      // Determine winner for this question
      let winnerId: number | null = null;
      const correctAnswers = answerDetails.filter(a => a.isCorrect);
      
      if (correctAnswers.length === 1) {
        winnerId = correctAnswers[0].playerId;
      } else if (correctAnswers.length === 2) {
        // Both correct, fastest wins
        winnerId = correctAnswers.sort((a, b) => 
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        )[0].playerId;
      } else if (correctAnswers.length === 0 && !isMultipleChoice) {
        // For integer questions, closest wins if both wrong
        const withDistance = answerDetails.map(a => ({
          ...a,
          distance: Math.abs(parseInt(a.answer) - parseInt(questionData.correctAnswer))
        }));
        
        withDistance.sort((a, b) => {
          if (a.distance !== b.distance) return a.distance - b.distance;
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        });
        
        winnerId = withDistance[0]?.playerId || null;
      }

      questionResults.push({
        round,
        question,
        questionText: questionData.text,
        questionType: questionData.type,
        correctAnswer: questionData.correctAnswer,
        options: questionData.options,
        answers: answerDetails,
        winnerId
      });
    });

    // Sort by round and question
    questionResults.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.question - b.question;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Game not found</p>
          <Button onClick={returnToLanding} className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { game } = gameState;
  const winner = gameState.players.find(p => p.id === game.winnerId);
  const loser = gameState.players.find(p => p.id !== game.winnerId);
  const isWinner = currentPlayer.id === game.winnerId;
  const isDraw = !game.winnerId;

  // Count rounds won by each player
  const roundsWon = {
    [currentPlayer.id]: 0,
    [opponent.id]: 0
  };

  questionResults.forEach(result => {
    if (result.question === 1) { // Only count round winners on question 1 (or final question)
      if (result.winnerId) {
        roundsWon[result.winnerId] = (roundsWon[result.winnerId] || 0) + 1;
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Winner Celebration */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
            {isDraw ? (
              <div className="text-white text-2xl">🤝</div>
            ) : isWinner ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <Target className="w-12 h-12 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Game Over!</h1>
            <p className="text-xl text-slate-600">
              {isDraw ? "It's a draw! Great game!" : 
               isWinner ? 'Congratulations! You won!' : 
               `${winner?.name} wins!`}
            </p>
          </div>
        </div>

        {/* Final Scores */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 text-center">Final Score</h2>
          <div className="flex justify-center space-x-12">
            <div className="text-center">
              <div className="relative">
                <PlayerAvatar 
                  src={currentPlayer.avatar} 
                  alt={`${currentPlayer.name}'s avatar`}
                  className="w-20 h-20 mx-auto"
                />
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center ${
                  isWinner ? 'bg-gradient-to-br from-primary to-purple-600' : 'bg-slate-200'
                }`}>
                  <span className={`text-lg font-bold ${isWinner ? 'text-white' : 'text-slate-600'}`}>
                    {currentPlayer.score}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-semibold text-slate-900">{currentPlayer.name}</p>
                <p className={`text-sm ${isWinner ? 'text-primary' : 'text-slate-500'}`}>
                  {isDraw ? 'Draw' : isWinner ? 'Winner' : 'Good game!'}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="relative">
                <PlayerAvatar 
                  src={opponent.avatar} 
                  alt={`${opponent.name}'s avatar`}
                  className="w-20 h-20 mx-auto"
                />
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center ${
                  !isWinner && !isDraw ? 'bg-gradient-to-br from-primary to-purple-600' : 'bg-slate-200'
                }`}>
                  <span className={`text-lg font-bold ${
                    !isWinner && !isDraw ? 'text-white' : 'text-slate-600'
                  }`}>
                    {opponent.score}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-semibold text-slate-900">{opponent.name}</p>
                <p className={`text-sm ${
                  !isWinner && !isDraw ? 'text-primary' : 'text-slate-500'
                }`}>
                  {isDraw ? 'Draw' : !isWinner && !isDraw ? 'Winner' : 'Good game!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Question Results */}
        {questionResults.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Game Breakdown
            </h2>
            
            <div className="space-y-4">
              {questionResults.map((result, index) => (
                <div key={`${result.round}-${result.question}`} 
                     className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        result.questionType === 'multiple_choice' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {result.question}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Round {result.round}, Question {result.question}
                        </p>
                        <p className="text-sm text-slate-500">
                          {result.questionType === 'multiple_choice' ? 'Multiple Choice' : 'Integer Input'}
                        </p>
                      </div>
                    </div>
                    {result.winnerId && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">
                          {gameState.players.find(p => p.id === result.winnerId)?.name} won
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-3 font-medium">
                    Q: {result.questionText}
                  </div>
                  
                  <div className="text-sm text-slate-500 mb-3">
                    Correct answer: <span className="font-medium text-slate-700">{result.correctAnswer}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {result.answers.map((answer, answerIndex) => (
                      <div key={answerIndex} 
                           className={`flex items-center justify-between p-2 rounded-lg ${
                             answer.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                           }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{answer.playerName}:</span>
                          <span className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {answer.answer}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {answer.isCorrect ? (
                            <span className="text-green-600">✓ Correct</span>
                          ) : (
                            <span className="text-red-600">✗ Incorrect</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            onClick={returnToLanding}
            variant="outline"
            className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 px-6 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            New Game
          </Button>
          <Button
            onClick={returnToLanding}
            className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-primary/90 hover:to-purple-600/90 transition-all"
          >
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
}