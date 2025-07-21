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
                    {answer && answer.answer !== 'no_answer' ? (
                      isCorrect ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">No answer</span>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border-2 ${
                    !answer || answer.answer === 'no_answer' 
                      ? 'border-gray-200 bg-gray-50' 
                      : isCorrect 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
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
              {question.options?.[correctIndex] || question.correct}
            </div>
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

        {/* Show both players' answers with winner highlight */}
        <div className="space-y-4">
          {playerAnswers.map(({ player, answer, label }) => {
            const userAnswer = answer ? answer.answer : 'no_answer';
            const isWinner = player.id === winnerId;
            const isExact = userAnswer !== 'no_answer' && parseInt(userAnswer) === correctAnswer;
            
            return (
              <div key={player.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <PlayerAvatar src={player.avatar} alt={`${player.name}'s avatar`} className="w-8 h-8" />
                  <span className="font-medium">{label}</span>
                  {isWinner && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      Round Winner!
                    </span>
                  )}
                </div>
                <div className={`p-3 rounded-lg border-2 ${
                  isWinner 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Answer: </span>
                      {userAnswer === 'no_answer' ? 'No answer' : userAnswer}
                    </div>
                    {userAnswer !== 'no_answer' && (
                      <div className="text-xs text-muted-foreground">
                        {isExact ? (
                          <span className="text-green-600 font-medium">Exact!</span>
                        ) : (
                          <span>Off by: {Math.abs(parseInt(userAnswer) - correctAnswer)}</span>
                        )}
                      </div>
                    )}
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
            {correctAnswer}
          </div>
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