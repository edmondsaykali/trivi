import { useState, useEffect } from 'react';
import type { GameState } from '@/types/game';

export function useGameState(gameId: number | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Use polling instead of real-time subscriptions for now
    const fetchGameState = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        if (response.ok) {
          const data = await response.json();
          setGameState(data);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch game state');
          setGameState(null);
        }
      } catch (err) {
        setError('Network error');
        setGameState(null);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchGameState();

    // Poll every second
    const interval = setInterval(fetchGameState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [gameId]);

  return { gameState, loading, error };
}
