import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface LobbyProps {
  params: { id: string };
}

export default function Lobby({ params }: LobbyProps) {
  const gameId = parseInt(params.id);
  const { gameState, loading } = useGameState(gameId);
  const [isStarting, setIsStarting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const isCreator = currentPlayer?.id === gameState?.game.creatorId;

  useEffect(() => {
    if (gameState?.game.status === 'playing') {
      setLocation(`/game/${gameId}`);
    }
  }, [gameState?.game.status, gameId, setLocation]);

  const startGame = async () => {
    if (!isCreator) return;
    
    setIsStarting(true);
    try {
      await apiRequest('POST', `/api/games/${gameId}/start`, {});
      toast({
        title: "Game Started!",
        description: "Get ready for the first question.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start game.",
      });
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
          </div>
          <p className="text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Game not found</p>
          <Button 
            onClick={() => setLocation('/')}
            className="mt-4"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { game, players } = gameState;
  const canStart = players.length === 2 && isCreator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Game Lobby</h1>
          <div className="bg-card rounded-2xl p-6 shadow-lg border">
            <p className="text-sm text-muted-foreground mb-2">Game Code</p>
            <div className="text-4xl font-bold text-primary tracking-widest">{game.code}</div>
            <p className="text-sm text-muted-foreground mt-2">Share this code with your friend</p>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Players ({players.length}/2)</h2>
          
          <div className="space-y-3">
            {players.map((player) => (
              <div key={player.id} className="flex items-center space-x-4 p-3 bg-secondary/50 rounded-xl">
                <PlayerAvatar 
                  src={player.avatar} 
                  alt={`${player.name}'s avatar`}
                  className="w-12 h-12"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {player.name}
                    {player.id === currentPlayer?.id && " (You)"}
                    {player.id === game.creatorId && " (Host)"}
                  </p>
                  <p className="text-sm text-muted-foreground">Ready to play</p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            ))}
            
            {players.length < 2 && (
              <div className="flex items-center space-x-4 p-3 bg-muted rounded-xl border-2 border-dashed border-border">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Waiting for player...</p>
                  <p className="text-sm text-muted-foreground">Share the game code above</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {players.length < 2 ? (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-primary rounded-full mx-auto mb-2"></div>
            </div>
            <p className="text-muted-foreground">Waiting for another player to join...</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-green-600">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-slate-600">All players ready!</p>
          </div>
        )}

        {/* Start Button */}
        {canStart && (
          <Button
            onClick={startGame}
            disabled={isStarting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-500/90 hover:to-green-600/90 transition-all shadow-lg"
          >
            {isStarting ? 'Starting Game...' : 'Start Game'}
          </Button>
        )}
        
        {!isCreator && players.length === 2 && (
          <div className="text-center">
            <p className="text-slate-600">Waiting for host to start the game...</p>
          </div>
        )}
      </div>
    </div>
  );
}
