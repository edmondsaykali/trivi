import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JoinGameModal } from '@/components/game/join-game-modal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function Landing() {
  const [username, setUsername] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Load username from sessionStorage
    const savedUsername = sessionStorage.getItem('trivi-username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const createGame = async () => {
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter your name to create a game.",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Save username to sessionStorage
      sessionStorage.setItem('trivi-username', username.trim());
      
      const response = await apiRequest('POST', '/api/games', {
        name: username.trim()
      });
      
      const result = await response.json();
      
      // Store session info
      sessionStorage.setItem('trivi-session', result.sessionId);
      sessionStorage.setItem('trivi-game-id', result.game.id.toString());
      
      setLocation(`/lobby/${result.game.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create game. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async (code: string) => {
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter your name to join a game.",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Save username to sessionStorage
      sessionStorage.setItem('trivi-username', username.trim());
      
      const response = await apiRequest('POST', '/api/games/join', {
        code,
        name: username.trim()
      });
      
      const result = await response.json();
      
      // Store session info
      sessionStorage.setItem('trivi-session', result.sessionId);
      sessionStorage.setItem('trivi-game-id', result.game.id.toString());
      
      setShowJoinModal(false);
      setLocation(`/lobby/${result.game.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join game. Please check the code and try again.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/10 to-secondary/20">
      <div className="w-full max-w-md space-y-8">
        {/* Username Input */}
        <div className="space-y-2">
          <Input
            id="username"
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createGame();
              }
            }}
            className="w-full px-4 py-3 rounded-xl text-lg"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={createGame}
            disabled={isCreating}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </Button>
          
          <Button
            onClick={() => setShowJoinModal(true)}
            variant="outline"
            disabled={isJoining}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all"
          >
            Join Game
          </Button>
        </div>

        {/* Join Game Modal */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Have a game code? Click "Join Game" to enter it</p>
        </div>
      </div>

      <JoinGameModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onJoin={joinGame}
      />
    </div>
  );
}
