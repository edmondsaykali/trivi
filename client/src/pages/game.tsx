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

// Component to show results after each question
function QuestionResultsModal({ gameState, currentPlayer, opponent }: QuestionResultsModalProps) {
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
  
  // Use the ResultsDisplay component
  return (
    <ResultsDisplay 
      gameState={gameState} 
      currentPlayer={currentPlayer} 
      opponent={opponent} 
      answers={answers} 
    />
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
  
  // Mark that we're in the game to prevent lobby cleanup
  useEffect(() => {
    sessionStorage.setItem('trivi-in-game', 'true');
    return () => {
      sessionStorage.removeItem('trivi-in-game');
    };
  }, []);
  
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

  // Check if game ended (someone left)
  useEffect(() => {
    // Show message if game finished with no winner (indicates disconnection)
    if (gameState && gameState.game.status === 'finished' && gameState.game.winnerId === null) {
      toast({
        title: "Game Ended",
        description: "The other player has left the game.",
      });
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    }
  }, [gameState?.game.status, gameState?.game.winnerId, toast, setLocation]);

  // Send heartbeat during game
  useEffect(() => {
    const sessionId = sessionStorage.getItem('trivi-session');
    if (!sessionId || gameState?.game.status !== 'playing') return;

    const sendHeartbeat = async () => {
      try {
        await apiRequest('POST', `/api/games/${gameId}/heartbeat`, { sessionId });
      } catch (error) {
        console.error('Game heartbeat error:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 5 seconds
    const interval = setInterval(sendHeartbeat, 5000);

    return () => clearInterval(interval);
  }, [gameId, gameState?.game.status]);

  // Scroll to top on component mount  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        // Time's up, don't submit
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

  // Show results when game status is showing_results
  if (gameState.game.status === 'showing_results' && currentPlayer && opponent) {
    return <QuestionResultsModal gameState={gameState} currentPlayer={currentPlayer} opponent={opponent} />;
  }
  
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
              className="p-2"
            >
              <Home className="w-4 h-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
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

        {/* Question Card */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border space-y-6">
          <div className="space-y-4">
            {/* Integrated Timer Bar */}
            <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden border border-border">
              <TimerBar deadline={game.questionDeadline || null} minimal />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">{question.text}</h2>
              {question.type === 'integer' && (
                <p className="text-muted-foreground text-sm">Enter your best guess as a whole number</p>
              )}
            </div>
          </div>

          {question.type === 'multiple_choice' && question.options ? (
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
                      : hasAnswered
                      ? 'border-muted bg-muted/50 cursor-not-allowed'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-foreground">{option}</span>
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
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Waiting for {opponent?.name}...</p>
          </div>
        )}


      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? This will end the game and your opponent will win.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in Game</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation('/')}>
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
