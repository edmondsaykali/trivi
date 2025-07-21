// Real-time game state subscription using polling (simulating Supabase Realtime)
// This provides the foundation for real Supabase Realtime integration

export interface GameSubscription {
  unsubscribe: () => void;
}

export function subscribeToGame(
  gameId: number, 
  callback: (gameState: any) => void
): GameSubscription {
  let isActive = true;
  let lastStateHash = '';
  
  async function poll() {
    if (!isActive) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (response.ok) {
        const gameState = await response.json();
        
        // Only trigger callback if state actually changed
        const stateHash = JSON.stringify(gameState);
        if (stateHash !== lastStateHash) {
          lastStateHash = stateHash;
          callback(gameState);
        }
      }
    } catch (error) {
      console.error('Error polling game state:', error);
    }
    
    if (isActive) {
      setTimeout(poll, 1000); // Poll every second
    }
  }
  
  // Initial fetch
  poll();
  
  return {
    unsubscribe: () => {
      isActive = false;
    }
  };
}
