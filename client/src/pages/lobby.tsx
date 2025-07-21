import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft } from 'lucide-react';

interface LobbyProps {
  params: { id: string };
}

export default function Lobby({ params }: LobbyProps) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
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

  // Only handle actual browser close/refresh, not navigation within app
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      if (sessionId) {
        navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId]);

  const startGame = async () => {
    if (!isCreator) return;
    
    setIsStarting(true);
    try {
      await apiRequest('POST', `/api/games/${gameId}/start`, {});
      // No toast needed, game will start
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Lobby</h1>
          <div className="w-8"></div>
        </div>
        
        {/* Game Code */}
        <div className="text-center">
          <div className="bg-card rounded-xl p-4 border">
            <p className="text-xs text-muted-foreground mb-1">Game Code</p>
            <div className="text-3xl font-bold text-primary tracking-wider">{game.code}</div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-card rounded-xl p-4 border">
          <div className="space-y-3">
            {players.map((player) => (
              <div key={player.id} className="flex items-center space-x-3">
                <PlayerAvatar 
                  src={player.avatar} 
                  alt={`${player.name}'s avatar`}
                  className="w-10 h-10"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {player.name}
                    {player.id === currentPlayer?.id && " (You)"}
                    {player.id === game.creatorId && " (Host)"}
                  </p>
                </div>
              </div>
            ))}
            
            {players.length < 2 && (
              <div className="flex items-center space-x-3 opacity-50">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Waiting for player...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {players.length < 2 ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Waiting for another player...</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-green-600">Ready to start!</p>
          </div>
        )}

        {/* Start Button */}
        {canStart && (
          <Button
            onClick={startGame}
            disabled={isStarting}
            className="w-full py-3 rounded-xl font-medium"
          >
            {isStarting ? 'Starting...' : 'Start Game'}
          </Button>
        )}
        
        {!isCreator && players.length === 2 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Waiting for host...</p>
          </div>
        )}
      </div>
    </div>
  );
}
