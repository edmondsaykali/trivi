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
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Trivi</h1>
            <p className="text-lg text-slate-600 mt-2">Challenge friends in real-time trivia battles</p>
          </div>
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-slate-700">
            Your Name
          </Label>
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={createGame}
            disabled={isCreating}
            className="w-full bg-gradient-to-r from-primary to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-primary/90 hover:to-purple-600/90 transition-all transform hover:scale-105 shadow-lg"
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </Button>
          
          <Button
            onClick={() => setShowJoinModal(true)}
            variant="outline"
            disabled={isJoining}
            className="w-full bg-white border-2 border-slate-200 text-slate-700 py-4 px-6 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-all"
          >
            Join Game
          </Button>
        </div>

        {/* Join Game Modal */}
        <div className="text-center">
          <p className="text-sm text-slate-500">Have a game code? Click "Join Game" to enter it</p>
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
