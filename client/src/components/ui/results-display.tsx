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
  
  if (question && question.type === 'multiple_choice') {
    const correctIndex = typeof question.correct === 'string' 
      ? question.options?.findIndex((opt) => opt === question.correct) ?? -1
      : question.correct;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
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
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Correct Answer: </span>
            <span className="text-sm font-medium text-foreground">{question.options?.[correctIndex] || question.correct}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-lg border">
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
            const submissionTime = answer ? new Date(answer.submittedAt).toLocaleTimeString() : null;
            
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
                  {userAnswer !== 'no_answer' && submissionTime && (
                    <span className="text-xs text-muted-foreground">
                      {submissionTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show correct answer - Simple */}
        <div className="text-center">
          <span className="text-sm text-muted-foreground">Correct Answer: </span>
          <span className="text-sm font-medium text-foreground">{correctAnswer}</span>
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