import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { useGameState } from '@/hooks/use-game-state';

interface ResultsProps {
  params: { id: string };
}

export default function Results({ params }: ResultsProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading } = useGameState(gameId);
  const [, setLocation] = useLocation();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== sessionId);

  useEffect(() => {
    if (gameState?.game.status !== 'finished') {
      setLocation(`/game/${gameId}`);
    }
  }, [gameState?.game.status, gameId, setLocation]);

  const returnToLanding = () => {
    // Clear session data
    sessionStorage.removeItem('trivi-session');
    sessionStorage.removeItem('trivi-game-id');
    setLocation('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Game not found</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        {/* Winner Celebration */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto">
            {isWinner ? (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3l14 9-14 9V3z"></path>
              </svg>
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Game Over!</h1>
            <p className="text-xl text-slate-600">
              {isWinner ? 'Congratulations! You won!' : `${winner?.name} wins!`}
            </p>
          </div>
        </div>

        {/* Final Scores */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 text-center">Final Score</h2>
          <div className="flex justify-center space-x-12">
            <div className="text-center">
              <PlayerAvatar 
                src={winner?.avatar || ''} 
                alt={`${winner?.name}'s avatar`}
                className="w-20 h-20 mx-auto mb-2"
              />
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 bg-gradient-to-br from-primary to-purple-600 absolute -mt-20">
                <span className="text-3xl font-bold text-white">{winner?.score}</span>
              </div>
              <div className="mt-2">
                <p className="font-semibold text-slate-900">{winner?.name}</p>
                <p className="text-sm text-primary">Winner</p>
              </div>
            </div>
            <div className="text-center">
              <PlayerAvatar 
                src={loser?.avatar || ''} 
                alt={`${loser?.name}'s avatar`}
                className="w-20 h-20 mx-auto mb-2"
              />
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 bg-slate-200 absolute -mt-20">
                <span className="text-3xl font-bold text-slate-600">{loser?.score}</span>
              </div>
              <div className="mt-2">
                <p className="font-semibold text-slate-900">{loser?.name}</p>
                <p className="text-sm text-slate-500">Good game!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Statistics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Game Summary</h2>
          
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: Math.max(winner?.score || 0, loser?.score || 0) }, (_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Round {index + 1}</p>
                    <p className="text-sm text-slate-500">
                      {index % 2 === 0 ? 'Multiple Choice' : 'Number Input'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {/* This is a simplified display - in a real app, you'd track round winners */}
                    Round Complete
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            onClick={returnToLanding}
            variant="outline"
            className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 px-6 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all"
          >
            New Game
          </Button>
          <Button
            onClick={() => {
              // For simplicity, just go to landing for rematch
              returnToLanding();
            }}
            className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-primary/90 hover:to-purple-600/90 transition-all"
          >
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
}
