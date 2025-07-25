import { Check, X } from 'lucide-react';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import type { GameState, Player, Question } from '@/types/game';

interface ResultsDisplayProps {
  gameState: GameState;
  currentPlayer: Player;
  opponent: Player;
  answers: any[];
}

export function ResultsDisplay({ gameState, currentPlayer, opponent, answers }: ResultsDisplayProps) {
  const { game } = gameState;
  const question = game.questionData as Question;
  
  if (!question) return null;
  
  const currentPlayerAnswer = answers.find(a => a.playerId === currentPlayer.id);
  const opponentAnswer = answers.find(a => a.playerId === opponent.id);
  
  if (question.type === 'multiple_choice') {
    const correctIndex = typeof question.correct === 'number'
      ? question.correct
      : question.options?.findIndex((opt) => opt === String(question.correct)) ?? -1;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Question Results</h2>
            <p className="text-muted-foreground">{question.text}</p>
          </div>

          {/* Show both players' answers - Simplified */}
          <div className="space-y-3">
            {[
              { player: currentPlayer, answer: currentPlayerAnswer, label: currentPlayer.name === opponent.name ? "You" : currentPlayer.name },
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

          {/* Show correct answer - Simple */}
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Round {game.currentRound} Complete!</h2>
          <p className="text-muted-foreground">{question.text}</p>
        </div>

        {/* Show both players' answers - Simplified */}
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
                  {userAnswer !== 'no_answer' && elapsedTime && (
                    <span className="text-xs text-muted-foreground">
                      {elapsedTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show correct answer - Simple */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Correct Answer:</p>
          <p className="text-base font-semibold text-green-600">{correctAnswer}</p>
        </div>

        {/* Updated scores */}
        <div className="flex justify-center space-x-8 pt-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{currentPlayer.score}</div>
            <div className="text-sm text-muted-foreground">Your Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">{opponent.score}</div>
            <div className="text-sm text-muted-foreground">{opponent.name}'s Score</div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {currentPlayer.score >= 5 || opponent.score >= 5 
              ? 'Game Over! Final results loading...'
              : 'Next round starting...'}
          </p>
        </div>
      </div>
    </div>
  );
}