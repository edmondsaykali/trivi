import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

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

  // Check if other player left the lobby
  useEffect(() => {
    if (!gameState) return;
    
    const lobbyKey = `trivi-lobby-${gameId}`;
    const previousPlayerCount = parseInt(sessionStorage.getItem(lobbyKey) || '0');
    const currentPlayerCount = gameState.players.length;
    
    // Update stored player count
    sessionStorage.setItem(lobbyKey, currentPlayerCount.toString());
    
    // Only show message if player count decreased (someone left)
    if (previousPlayerCount > currentPlayerCount && gameState.game.status === 'waiting') {
      toast({
        title: "Player Left",
        description: "The other player has left the lobby.",
      });
    }
  }, [gameState?.players.length, gameState?.game.status, gameId, toast]);

  // Handle leaving the lobby
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      if (sessionId) {
        navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
      }
    };

    const handleLeavePage = async () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      if (sessionId && gameState?.game.status === 'waiting') {
        try {
          await apiRequest('POST', `/api/games/${gameId}/leave`, { sessionId });
        } catch (error) {
          console.error('Error leaving game:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Leave game when component unmounts (navigating away)
      handleLeavePage();
    };
  }, [gameId, gameState?.game.status]);

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
    return null; // Don't show loading screen
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
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Game Code</p>
          <div className="text-3xl font-bold text-primary tracking-wider">{game.code}</div>
        </div>

        {/* Simple separator line */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-border"></div>
        </div>

        {/* Players List - Simple */}
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="text-center">
              <p className="text-sm font-medium text-foreground">
                {player.name}
              </p>
            </div>
          ))}
          
          {players.length < 2 && (
            <div className="text-center opacity-50">
              <p className="text-sm text-muted-foreground">Waiting for player...</p>
            </div>
          )}
        </div>



        {/* Start Button */}
        {canStart && (
          <div className="flex justify-center">
            <Button
              onClick={startGame}
              disabled={isStarting}
              className="py-3 px-8 rounded-xl font-medium"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </Button>
          </div>
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
