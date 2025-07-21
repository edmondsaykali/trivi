import { useState, useEffect, useRef } from 'react';
import { subscribeToGame, type GameSubscription } from '@/lib/supabase';
import type { GameState } from '@/types/game';

export function useGameState(gameId: number | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<GameSubscription | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    subscriptionRef.current = subscribeToGame(gameId, (newGameState) => {
      setGameState(newGameState);
      setLoading(false);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [gameId]);

  return { gameState, loading, error };
}
