import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

import { useGameState } from '@/hooks/use-game-state';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Play } from 'lucide-react';

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
  const [lobbyMessage, setLobbyMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const sessionId = sessionStorage.getItem('trivi-session');
  const currentPlayer = gameState?.players.find(p => p.sessionId === sessionId);
  const isCreator = currentPlayer?.id === gameState?.game.creatorId;

  useEffect(() => {
    if (gameState?.game.status === 'playing') {
      setIsTransitioning(true);
      // Mark that we've transitioned to prevent false positives
      sessionStorage.setItem(`trivi-transitioned-${gameId}`, 'true');
      sessionStorage.setItem(`trivi-game-starting-${gameId}`, 'true');
      // Clear the lobby key to prevent incorrect player count comparisons
      sessionStorage.removeItem(`trivi-lobby-${gameId}`);
      setLocation(`/game/${gameId}`);
    } else if (gameState?.game.status === 'finished') {
      // Don't redirect to results from lobby
      console.error('Game finished before starting - something went wrong');
    }
  }, [gameState?.game.status, gameId, setLocation]);

  // Check if game was closed or player left
  useEffect(() => {
    if (!gameState) return;
    
    // Check if we've already transitioned or are in the process
    const hasTransitioned = sessionStorage.getItem(`trivi-transitioned-${gameId}`) === 'true';
    if (hasTransitioned) return;
    
    // Only show "lobby closed" if game finished before it started (in waiting status)
    // If the game is playing or was playing, don't show this message
    if (gameState.game.status === 'finished' && !isStarting && !isTransitioning && 
        gameState.game.currentRound === 1 && gameState.game.currentQuestion === 1 && 
        !gameState.game.questionData) {
      // Show subtle message instead of popup
      setLobbyMessage("The host has closed this lobby.");
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
      setLobbyMessage("The other player has left the lobby.");
    }
  }, [gameState?.players.length, gameState?.game.status, gameId, toast, isCreator, isStarting, isTransitioning, setLocation]);

  // Track if component is mounted
  const [isMounted, setIsMounted] = useState(true);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle leaving the lobby
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Skip on mobile - causes issues
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) return;
      
      const sessionId = sessionStorage.getItem('trivi-session');
      // Don't leave if we're transitioning to game or if game has started
      if (sessionId && gameState?.game.status === 'waiting' && !isTransitioning && !isStarting) {
        // Double-check the game status isn't changing
        const currentStatus = gameState?.game.status;
        if (currentStatus === 'waiting') {
          navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
        }
      }
    };

    const handleLeavePage = async () => {
      const sessionId = sessionStorage.getItem('trivi-session');
      // Only leave if game is still in waiting status and we're not transitioning
      if (sessionId && gameState?.game.status === 'waiting' && !isStarting && !isTransitioning && isMounted) {
        try {
          await apiRequest('POST', `/api/games/${gameId}/leave`, { sessionId });
        } catch (error) {
          console.error('Error leaving game:', error);
        }
      }
    };

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      // Skip visibility change handling if we're transitioning or starting
      if (isStarting || isTransitioning) return;
      
      if (document.hidden) {
        const sessionId = sessionStorage.getItem('trivi-session');
        // Only leave if we're alone in the lobby (prevents mobile issues)
        if (sessionId && gameState?.game.status === 'waiting' && 
            gameState?.players.length < 2) {
          navigator.sendBeacon(`/api/games/${gameId}/leave`, JSON.stringify({ sessionId }));
        }
      }
    };

    // Only add beforeunload handler - visibility change causes issues on mobile
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Don't use visibility change handler on mobile as it fires during navigation
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      // Check if we've transitioned or game is starting before leaving
      const hasTransitioned = sessionStorage.getItem(`trivi-transitioned-${gameId}`) === 'true';
      const gameStarting = sessionStorage.getItem(`trivi-game-starting-${gameId}`) === 'true';
      // Call leave immediately during cleanup, before any state changes
      if (gameState?.game.status === 'waiting' && !isTransitioning && !isStarting && !hasTransitioned && !gameStarting && isMounted) {
        handleLeavePage();
      }
    };
  }, [gameId, gameState?.game.status, isStarting, isTransitioning, isMounted]);



  const startGame = async () => {
    if (!isCreator) return;
    
    setIsStarting(true);
    // Set a flag to prevent any leave game logic
    sessionStorage.setItem(`trivi-game-starting-${gameId}`, 'true');
    
    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start game');
      }
      
      const data = await response.json();
      console.log('Game started successfully:', data);
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
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Lobby</h1>
          <div className="w-8"></div>
        </div>
        
        {/* Game Code */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Game Code</p>
          <div className="text-4xl font-bold text-primary tracking-wider">{game.code}</div>
        </div>

        {/* Simple separator line */}
        <div className="flex justify-center">
          <div className="w-16 h-px bg-border"></div>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">Players:</h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <p className="text-base font-medium text-foreground">
                  {player.name}
                </p>
              </div>
            ))}
            
            {players.length < 2 && (
              <div className="text-center opacity-50">
                <p className="text-base text-muted-foreground">Waiting for player...</p>
              </div>
            )}
          </div>
        </div>



        {/* Start Button */}
        {canStart && (
          <Button
            onClick={startGame}
            disabled={isStarting}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {isStarting ? 'Starting...' : 'Start Game'}
          </Button>
        )}
        
        {!isCreator && players.length === 2 && (
          <div className="text-center">
            <p className="text-base text-muted-foreground">Waiting for host...</p>
          </div>
        )}
        
        {/* Subtle lobby message */}
        {lobbyMessage && (
          <div className="text-center">
            <p className="text-sm text-red-500">{lobbyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
