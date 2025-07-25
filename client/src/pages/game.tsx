import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimerBar } from '@/components/ui/timer-bar';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { ResultsDisplay } from '@/components/ui/results-display';
import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Home, Check, X, Clock } from 'lucide-react';
import type { Question } from '@/types/game';
import type { GameState, Player } from '@/types/game';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GameProps {
  params: { id: string };
}

interface QuestionResultsModalProps {
  gameState: GameState;
  currentPlayer: Player;
  opponent: Player;
}

// Component to show results inline within the same card
function InlineResultsDisplay({ gameState, currentPlayer, opponent }: QuestionResultsModalProps) {
  const { game } = gameState;
  const [answers, setAnswers] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch answers for this round/question
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
  
  const question = game.questionData as Question;
  
  if (!question) return null;
  
  const currentPlayerAnswer = answers.find(a => a.playerId === currentPlayer.id);
  const opponentAnswer = answers.find(a => a.playerId === opponent.id);
  
  if (question.type === 'multiple_choice') {
    const correctIndex = typeof question.correct === 'number'
      ? question.correct
      : question.options?.findIndex((opt) => opt === String(question.correct)) ?? -1;
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Question Results</h2>
          <p className="text-muted-foreground">{question.text}</p>
        </div>

        {/* Show both players' answers */}
        <div className="space-y-3">
          {[
            { player: currentPlayer, answer: currentPlayerAnswer, label: "You" },
            { player: opponent, answer: opponentAnswer, label: opponent.name }
          ].map(({ player, answer, label }) => {
            const selectedIndex = answer ? parseInt(answer.answer) : -1;
            const isCorrect = selectedIndex === correctIndex;
            const answerText = selectedIndex >= 0 && question.options ? question.options[selectedIndex] : 'No answer';
            
            return (
              <div key={player.id} className="flex items-center justify-between">
                <span className="font-medium text-foreground">{label}</span>
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  !answer || answer.answer === 'no_answer' 
                    ? 'bg-gray-100 text-gray-600' 
                    : isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  {answerText}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show correct answer */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Correct Answer:</p>
          <p className="text-base font-semibold text-green-600">{question.options?.[correctIndex] || question.correct}</p>
        </div>

        {/* Round result for Q1 */}
        {game.currentQuestion === 1 && game.lastRoundWinnerId && (
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <h3 className="font-bold text-primary">
              {game.lastRoundWinnerId === currentPlayer.id ? 'You win' : `${opponent.name} wins`} the round!
            </h3>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {game.currentQuestion === 1 && !game.lastRoundWinnerId 
              ? 'Moving to Question 2...' 
              : 'Next round starting...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Integer question results
  const correctAnswer = typeof question.correct === 'number' ? question.correct : parseInt(question.correct as string);
  const playerAnswers = [
    { player: currentPlayer, answer: currentPlayerAnswer, label: "You" },
    { player: opponent, answer: opponentAnswer, label: opponent.name }
  ];
  
  // Determine who won
  const winnerId = game.lastRoundWinnerId;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Round {game.currentRound} Complete!</h2>
        <p className="text-muted-foreground">{question.text}</p>
      </div>

      {/* Show both players' answers */}
      <div className="space-y-3">
        {playerAnswers.map(({ player, answer, label }) => {
          const userAnswer = answer ? answer.answer : 'no_answer';
          const isWinner = player.id === winnerId;
          const isExact = userAnswer !== 'no_answer' && parseInt(userAnswer) === correctAnswer;
          
          // Calculate elapsed time instead of timestamp
          let elapsedTime = null;
          if (answer && answer.submittedAt && game.questionDeadline) {
            const submitTime = new Date(answer.submittedAt).getTime();
            const questionStartTime = new Date(game.questionDeadline).getTime() - 15000; // 15 seconds before deadline
            const elapsed = Math.round((submitTime - questionStartTime) / 1000);
            if (elapsed > 0 && elapsed <= 15) {
              elapsedTime = `${elapsed}s`;
            }
          }
          
          return (
            <div key={player.id} className="flex items-center justify-between">
              <span className="font-medium text-foreground">{label}</span>
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  userAnswer === 'no_answer' 
                    ? 'bg-gray-100 text-gray-600' 
                    : isWinner 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  {userAnswer === 'no_answer' ? 'No answer' : userAnswer}
                </div>
                {elapsedTime && (
                  <span className="text-xs text-muted-foreground">({elapsedTime})</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show correct answer */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Correct Answer:</p>
        <p className="text-base font-semibold text-green-600">{correctAnswer}</p>
      </div>

      {/* Round winner */}
      {winnerId && (
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <h3 className="font-bold text-primary">
            {winnerId === currentPlayer.id ? 'You win' : `${opponent.name} wins`} the round!
          </h3>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Next round starting...</p>
      </div>
    </div>
  );
}

export default function Game({ params }: GameProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading, error } = useGameState(gameId);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [integerAnswer, setIntegerAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== sessionId);
  
  // Debug logging
  if (gameState && !currentPlayer && sessionId) {
    console.error('Session mismatch:', {
      sessionId,
      players: gameState.players.map(p => ({ id: p.id, name: p.name, sessionId: p.sessionId }))
    });
  }

  useEffect(() => {
    if (gameState?.game.status === 'finished') {
      // Add small delay to prevent loading screen stuck
      setTimeout(() => {
        setLocation(`/results/${gameId}`);
      }, 100);
    }
  }, [gameState?.game.status, gameId, setLocation]);



  // Scroll to top on component mount  
  useEffect(() => {
    window.scrollTo(0, 0);
    // Clear the transition flags when we reach the game page
    sessionStorage.removeItem(`trivi-transitioned-${gameId}`);
    sessionStorage.removeItem(`trivi-game-starting-${gameId}`);
  }, [gameId]);

  useEffect(() => {
    // Reset answer state when question changes
    if (gameState?.game.questionData) {
      const currentQuestionId = `${gameState.game.currentRound}-${gameState.game.currentQuestion}-${JSON.stringify(gameState.game.questionData)}`;
      if (lastQuestionId !== currentQuestionId) {
        setSelectedAnswer(null);
        setIntegerAnswer('');
        setHasAnswered(false);
        setIsSubmitting(false);
        setLastQuestionId(currentQuestionId);
      }
    }
  }, [gameState?.game.currentRound, gameState?.game.currentQuestion, gameState?.game.questionData, lastQuestionId]);

  const submitAnswer = async (answer: string | number) => {
    if (hasAnswered || isSubmitting) return;
    
    // Check if deadline has passed
    if (gameState?.game.questionDeadline) {
      const now = new Date().getTime();
      const deadline = new Date(gameState.game.questionDeadline).getTime();
      if (now > deadline) {
        // Show subtle time's up message
        const timeUpEl = document.getElementById('time-up-message');
        if (timeUpEl) {
          timeUpEl.classList.remove('hidden');
          setTimeout(() => timeUpEl.classList.add('hidden'), 3000);
        }
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      await apiRequest('POST', `/api/games/${gameId}/answer`, {
        answer,
        sessionId
      });
      
      setHasAnswered(true);
      // Show subtle waiting message instead of popup toast
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
      // Show subtle error instead of popup
      const errorEl = document.getElementById('integer-error');
      if (errorEl) {
        errorEl.textContent = 'Please enter a valid number';
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 2000);
      }
      return;
    }
    submitAnswer(numValue);
  };

  if (loading) {
    return null; // Don't show loading screen
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Game Not Found</h2>
          <p className="text-muted-foreground">{error || "This game doesn't exist or has ended."}</p>
          <Button onClick={() => setLocation('/')} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionId || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-yellow-500 text-xl">🔒</div>
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You don't have access to this game.</p>
          <Button onClick={() => setLocation('/')} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Show results inline when game status is showing_results
  const showingResults = gameState.game.status === 'showing_results';
  
  // Redirect to final results page when game is finished
  if (gameState.game.status === 'finished') {
    setLocation(`/results/${gameId}`);
    return null;
  }

  const { game } = gameState;
  const question = game.questionData as Question;

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Waiting for question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Game Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              className="p-3"
            >
              <Home className="w-5 h-5" />
            </Button>
            <div className="text-base text-muted-foreground font-medium">
              Round {game.currentRound}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{currentPlayer.score}</div>
              <div className="text-xs text-muted-foreground">You</div>
            </div>
            <div className="text-muted-foreground text-sm">vs</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{opponent?.score || 0}</div>
              <div className="text-xs text-muted-foreground">{opponent?.name || 'Opponent'}</div>
            </div>
          </div>
        </div>

        {/* Question/Results Card */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border space-y-6">
          {!showingResults ? (
            <div className="space-y-4">
              {/* Integrated Timer Bar */}
              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden border border-border">
                <TimerBar deadline={game.questionDeadline || null} minimal />
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-foreground">{question.text}</h2>
              </div>
            </div>
          ) : (
            <InlineResultsDisplay gameState={gameState} currentPlayer={currentPlayer!} opponent={opponent!} />
          )}

          {!showingResults && question.type === 'multiple_choice' && question.options ? (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleMultipleChoice(index)}
                  disabled={hasAnswered || isSubmitting}
                  className={`w-full text-left p-4 border-2 rounded-xl transition-all group ${
                    selectedAnswer === index
                      ? 'border-primary bg-primary/5'
                      : selectedAnswer !== null && selectedAnswer !== index
                      ? 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                      : hasAnswered
                      ? 'border-muted bg-muted/50 cursor-not-allowed'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-center">
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : !showingResults ? (
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
                    if (e.key === 'Enter' || e.key === 'Done') {
                      e.preventDefault();
                      handleIntegerSubmit();
                    }
                  }}
                  disabled={hasAnswered || isSubmitting}
                  className="w-full text-center text-lg sm:text-2xl font-bold py-4 px-6 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-sm sm:placeholder:text-lg"
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleIntegerSubmit}
                  disabled={!integerAnswer || hasAnswered || isSubmitting}
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-400/90 hover:to-orange-500/90 transition-all shadow-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
                <p id="integer-error" className="text-red-500 text-sm text-center hidden"></p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Answer Status */}
        {hasAnswered && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Waiting for {opponent?.name}...</p>
          </div>
        )}

        {/* Time's Up Message */}
        <div id="time-up-message" className="hidden text-center">
          <p className="text-red-500 text-sm font-medium">Time's up!</p>
        </div>


      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation('/')} className="flex-1">
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
