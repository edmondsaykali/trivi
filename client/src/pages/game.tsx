import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimerBar } from '@/components/ui/timer-bar';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';
import type { Question } from '@/types/game';
import type { GameState, Player } from '@/types/game';

interface GameProps {
  params: { id: string };
}

interface QuestionResultsModalProps {
  gameState: GameState;
  currentPlayer: Player;
  opponent: Player;
}

// Component to show results after each question
function QuestionResultsModal({ gameState, currentPlayer, opponent }: QuestionResultsModalProps) {
  const { game } = gameState;
  const question = game.questionData as Question;
  const winner = gameState.players.find(p => p.id === game.lastRoundWinnerId);
  
  // For now, we'll fetch the answers client-side - in production this would come from server
  const [answers, setAnswers] = useState<any[]>([]);
  
  useEffect(() => {
    // Simulate fetching answers for this round
    const fetchAnswers = async () => {
      try {
        const response = await fetch(`/api/games/${game.id}/answers?round=${game.currentRound}&question=${game.currentQuestion}`);
        if (response.ok) {
          const data = await response.json();
          setAnswers(data);
        }
      } catch (error) {
        console.error('Failed to fetch answers:', error);
      }
    };
    
    fetchAnswers();
  }, [game.id, game.currentRound, game.currentQuestion]);
  
  const currentPlayerAnswer = answers.find(a => a.playerId === currentPlayer.id);
  const opponentAnswer = answers.find(a => a.playerId === opponent.id);
  
  if (question?.type === 'multiple_choice') {
    const correctIndex = question.options?.findIndex((opt, index) => index === question.correct) ?? -1;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Question Results</h2>
            <p className="text-muted-foreground">{question.text}</p>
          </div>

          {/* Show both players' answers */}
          <div className="space-y-4">
            {[
              { player: currentPlayer, answer: currentPlayerAnswer, label: "You" },
              { player: opponent, answer: opponentAnswer, label: opponent.name }
            ].map(({ player, answer, label }) => {
              const selectedIndex = answer ? parseInt(answer.answer) : -1;
              const isCorrect = selectedIndex === correctIndex;
              
              return (
                <div key={player.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <PlayerAvatar src={player.avatar} alt={`${player.name}'s avatar`} className="w-8 h-8" />
                    <span className="font-medium">{label}</span>
                    {isCorrect ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border-2 ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="text-sm">
                      <span className="font-medium">Answer: </span>
                      {selectedIndex >= 0 && question.options ? question.options[selectedIndex] : 'No answer'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show correct answer */}
          <div className="bg-green-100 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <span className="font-medium">Correct Answer: </span>
              {question.correct}
            </div>
          </div>

          {/* Winner announcement */}
          {winner && (
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <h3 className="font-bold text-primary">{winner.name} wins the round!</h3>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {game.currentQuestion === 1 ? 'Next question coming up...' : 'Next round starting...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Integer question results
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Question Results</h2>
          <p className="text-muted-foreground">{question.text}</p>
        </div>

        {/* Show both players' answers with timing */}
        <div className="space-y-4">
          {[
            { player: currentPlayer, answer: currentPlayerAnswer, label: "You" },
            { player: opponent, answer: opponentAnswer, label: opponent.name }
          ].map(({ player, answer, label }) => {
            const playerAnswer = answer ? parseInt(answer.answer) : null;
            const isCorrect = playerAnswer === question.correct;
            const distance = playerAnswer !== null ? Math.abs(playerAnswer - question.correct) : Infinity;
            
            return (
              <div key={player.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <PlayerAvatar src={player.avatar} alt={`${player.name}'s avatar`} className="w-8 h-8" />
                  <span className="font-medium">{label}</span>
                  {isCorrect && <Check className="w-5 h-5 text-green-600" />}
                </div>
                <div className={`p-3 rounded-lg border-2 ${
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm">
                        <span className="font-medium">Answer: </span>
                        {playerAnswer ?? 'No answer'}
                      </div>
                      {!isCorrect && playerAnswer !== null && (
                        <div className="text-xs text-muted-foreground">
                          Distance: {distance}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{answer ? Math.floor((new Date(answer.submittedAt).getTime() - new Date(game.questionDeadline!).getTime() + 15000) / 1000) : '--'}s</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show correct answer */}
        <div className="bg-green-100 border border-green-200 rounded-lg p-3">
          <div className="text-sm text-green-800">
            <span className="font-medium">Correct Answer: </span>
            {question.correct}
          </div>
        </div>

        {/* Winner announcement */}
        {winner && (
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <h3 className="font-bold text-primary">{winner.name} wins the round!</h3>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Next round starting...</p>
        </div>
      </div>
    </div>
  );
}

export default function Game({ params }: GameProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading } = useGameState(gameId);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [integerAnswer, setIntegerAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== sessionId);

  useEffect(() => {
    if (gameState?.game.status === 'finished') {
      setLocation(`/results/${gameId}`);
    }
  }, [gameState?.game.status, gameId, setLocation]);

  useEffect(() => {
    // Reset answer state when question changes
    if (gameState?.game.questionData) {
      setSelectedAnswer(null);
      setIntegerAnswer('');
      setHasAnswered(false);
    }
  }, [gameState?.game.currentRound, gameState?.game.currentQuestion]);

  const submitAnswer = async (answer: string | number) => {
    if (hasAnswered || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await apiRequest('POST', `/api/games/${gameId}/answer`, {
        answer,
        sessionId
      });
      
      setHasAnswered(true);
      toast({
        title: "Answer Submitted!",
        description: "Waiting for your opponent...",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit answer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMultipleChoice = (optionIndex: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(optionIndex);
    submitAnswer(optionIndex);
  };

  const handleIntegerSubmit = () => {
    if (!integerAnswer || hasAnswered) return;
    const numValue = parseInt(integerAnswer);
    if (isNaN(numValue)) {
      toast({
        variant: "destructive",
        title: "Invalid Answer",
        description: "Please enter a valid number.",
      });
      return;
    }
    submitAnswer(numValue);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Game not found</p>
          <Button onClick={() => setLocation('/')} className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { game } = gameState;
  const question = game.questionData as Question;

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-muted-foreground">Preparing question...</p>
        </div>
      </div>
    );
  }

  // Show result modal if waiting for answers to be processed
  if (game.waitingForAnswers) {
    return <QuestionResultsModal gameState={gameState} currentPlayer={currentPlayer} opponent={opponent} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Game Header */}
        <div className="flex justify-between items-center bg-card rounded-2xl p-4 shadow-lg border">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium text-muted-foreground">
              Round {game.currentRound} of 5 - Question {game.currentQuestion}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{currentPlayer.score}</div>
                <div className="text-xs text-muted-foreground">You</div>
              </div>
              <div className="text-muted-foreground">vs</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{opponent.score}</div>
                <div className="text-xs text-muted-foreground">{opponent.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Bar */}
        <TimerBar deadline={game.questionDeadline || null} />

        {/* Question Card */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border space-y-6">
          <div className="text-center space-y-2">
            {question.type === 'multiple_choice' && (
              <div className="text-sm font-medium px-3 py-1 rounded-full inline-block text-primary bg-primary/10">
                Multiple Choice
              </div>
            )}
            <h2 className="text-xl font-bold text-foreground">{question.text}</h2>
            {question.type === 'integer' && (
              <p className="text-muted-foreground text-sm">Enter your best guess as a whole number</p>
            )}
          </div>

          {question.type === 'multiple_choice' && question.options ? (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleMultipleChoice(index)}
                  disabled={hasAnswered || isSubmitting}
                  className={`w-full text-left p-4 border-2 rounded-xl transition-all group ${
                    selectedAnswer === index
                      ? 'border-primary bg-primary/5'
                      : hasAnswered
                      ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      selectedAnswer === index
                        ? 'bg-primary text-white'
                        : hasAnswered
                        ? 'bg-slate-200 text-slate-400'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium text-slate-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="max-w-xs mx-auto">
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Your answer"
                  value={integerAnswer}
                  onChange={(e) => setIntegerAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleIntegerSubmit();
                    }
                  }}
                  disabled={hasAnswered || isSubmitting}
                  className="w-full text-center text-2xl font-bold py-4 px-6 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <Button
                onClick={handleIntegerSubmit}
                disabled={!integerAnswer || hasAnswered || isSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-500/90 hover:to-green-600/90 transition-all shadow-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </div>
          )}
        </div>

        {/* Answer Status */}
        {hasAnswered && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
            <p className="text-primary font-medium">Answer submitted! Waiting for opponent...</p>
          </div>
        )}

        {/* Strategy Tip for Integer Questions */}
        {question.type === 'integer' && !hasAnswered && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Strategy Tip</p>
                <p>If both answers are wrong, the closest guess wins. Speed matters for tie-breakers!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
