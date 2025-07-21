import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimerBar } from '@/components/ui/timer-bar';
import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Question } from '@/types/game';

interface GameProps {
  params: { id: string };
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-slate-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Game not found</p>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-slate-600">Preparing question...</p>
        </div>
      </div>
    );
  }

  // Show result modal if waiting for answers to be processed
  if (game.waitingForAnswers && game.lastRoundWinnerId) {
    const winner = gameState.players.find(p => p.id === game.lastRoundWinnerId);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-6 transform animate-pulse">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Round Winner</h2>
            <p className="text-lg text-slate-600">{winner?.name}</p>
          </div>

          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{currentPlayer.score}</div>
              <div className="text-sm text-slate-500">You</div>
            </div>
            <div className="text-center text-slate-300 self-center">
              <div className="text-lg">vs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">{opponent.score}</div>
              <div className="text-sm text-slate-500">{opponent.name}</div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500">Next question coming up...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Game Header */}
        <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="text-sm font-medium text-slate-600">
              Round {game.currentRound} of 5 - Question {game.currentQuestion}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{currentPlayer.score}</div>
                <div className="text-xs text-slate-500">You</div>
              </div>
              <div className="text-slate-300">vs</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{opponent.score}</div>
                <div className="text-xs text-slate-500">{opponent.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Bar */}
        <TimerBar deadline={game.questionDeadline || null} />

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${
              question.type === 'multipleChoice' 
                ? 'text-primary bg-primary/10' 
                : 'text-green-600 bg-green-100'
            }`}>
              {question.type === 'multipleChoice' ? 'Multiple Choice' : 'Number Input'}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{question.text}</h2>
            {question.type === 'integer' && (
              <p className="text-slate-600 text-sm">Enter your best guess as a whole number</p>
            )}
          </div>

          {question.type === 'multipleChoice' && question.options ? (
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
                  placeholder="Your answer"
                  value={integerAnswer}
                  onChange={(e) => setIntegerAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleIntegerSubmit();
                    }
                  }}
                  disabled={hasAnswered || isSubmitting}
                  className="w-full text-center text-3xl font-bold py-4 px-6 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
