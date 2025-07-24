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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [gameHasStarted, setGameHasStarted] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const isCreator = currentPlayer?.id === gameState?.game.creatorId;

  useEffect(() => {
    if (gameState?.game.status === 'playing') {
      setGameHasStarted(true);
      setIsTransitioning(true);
      // Add delay to ensure isTransitioning is set before any cleanup
      setTimeout(() => {
        setLocation(`/game/${gameId}`);
      }, 50);
    } else if (gameState?.game.status === 'finished') {
      // Don't redirect to results from lobby
      console.error('Game finished before starting - something went wrong');
    }
  }, [gameState?.game.status, gameId, setLocation]);

  // Check if game was closed or player left
  useEffect(() => {
    if (!gameState) return;
    
    // If game finished while in lobby, host must have left
    if (gameState.game.status === 'finished' && !isStarting && !isTransitioning) {
      toast({
        title: "Lobby Closed",
        description: "The host has closed this lobby.",
      });
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      return;
    }
    
    const lobbyKey = `trivi-lobby-${gameId}`;
    const previousPlayerCount = parseInt(sessionStorage.getItem(lobbyKey) || '0');
    const currentPlayerCount = gameState.players.length;
    
    // Update stored player count
    sessionStorage.setItem(lobbyKey, currentPlayerCount.toString());
    
    // Only show message if player count decreased (someone left) and we're the host
    if (previousPlayerCount > currentPlayerCount && gameState.game.status === 'waiting' && isCreator) {
      toast({
        title: "Player Left",
        description: "The other player has left the lobby.",
      });
    }
  }, [gameState?.players.length, gameState?.game.status, gameId, toast, isCreator, isStarting, isTransitioning, setLocation]);

  // Update player activity in lobby
  useEffect(() => {
    if (!gameState || gameState.game.status !== 'waiting' || !sessionId) return;
    
    const updateActivity = async () => {
      try {
        await fetch(`/api/players/${sessionId}/activity`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to update player activity:', error);
      }
    };
    
    // Update activity immediately and then every 5 seconds
    updateActivity();
    const interval = setInterval(updateActivity, 5000);
    
    return () => clearInterval(interval);
  }, [gameState?.game.status, sessionId]);

  // Handle leaving the lobby
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      if (sessionId && gameState?.game.status === 'waiting' && !gameHasStarted) {
        navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
      }
    };

    const handleLeavePage = async () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      // Only leave if game is still in waiting status and we're not transitioning and game hasn't started
      if (sessionId && gameState?.game.status === 'waiting' && !isStarting && !isTransitioning && !gameHasStarted) {
        try {
          await apiRequest('POST', `/api/games/${gameId}/leave`, { sessionId });
        } catch (error) {
          console.error('Error leaving game:', error);
        }
      }
    };

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const sessionId = sessionStorage.getItem('trivi-session');
        if (sessionId && gameState?.game.status === 'waiting' && !isStarting && !isTransitioning && !gameHasStarted) {
          navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Don't call leave during cleanup to prevent race conditions
      // Only handle actual page unload via beforeunload event
    };
  }, [gameId, gameState?.game.status, isStarting, isTransitioning, gameHasStarted]);



  const startGame = async () => {
    if (!isCreator) return;
    
    setIsStarting(true);
    try {
      const response = await apiRequest('POST', `/api/games/${gameId}/start`, {});
      const data = await response.json();
      // No toast needed, game will start
    } catch (error: any) {
      console.error('Start game error:', error);
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
