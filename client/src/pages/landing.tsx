import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [username, setUsername] = useState("");
  const [showJoinSection, setShowJoinSection] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [highlightNameInput, setHighlightNameInput] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load username from sessionStorage
    const savedUsername = sessionStorage.getItem("trivi-username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const createGame = async () => {
    if (!username.trim()) {
      setHighlightNameInput(true);
      nameInputRef.current?.focus();
      setTimeout(() => setHighlightNameInput(false), 2000);
      return;
    }

    setIsCreating(true);
    try {
      // Save username to sessionStorage
      sessionStorage.setItem("trivi-username", username.trim());

      const response = await apiRequest("POST", "/api/games", {
        name: username.trim(),
      });

      const result = await response.json();

      // Store session info
      sessionStorage.setItem("trivi-session", result.sessionId);
      sessionStorage.setItem("trivi-game-id", result.game.id.toString());

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

  const joinGame = async () => {
    if (!username.trim()) {
      setHighlightNameInput(true);
      nameInputRef.current?.focus();
      setTimeout(() => setHighlightNameInput(false), 2000);
      return;
    }

    if (!gameCode.trim()) {
      toast({
        variant: "destructive",
        title: "Code Required",
        description: "Please enter a 4-digit game code.",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Save username to sessionStorage
      sessionStorage.setItem("trivi-username", username.trim());

      const response = await apiRequest("POST", "/api/games/join", {
        code: gameCode.trim(),
        name: username.trim(),
      });

      const result = await response.json();

      // Store session info
      sessionStorage.setItem("trivi-session", result.sessionId);
      sessionStorage.setItem("trivi-game-id", result.game.id.toString());

      setShowJoinSection(false);
      setGameCode("");
      setLocation(`/lobby/${result.game.id}`);
    } catch (error: any) {
      // Show error as subtle text instead of popup
      setGameCode("");
      const errorContainer = document.getElementById("join-error");
      if (errorContainer) {
        errorContainer.textContent =
          error.message || "Game not found or full. Please check the code.";
        errorContainer.classList.remove("hidden");
        setTimeout(() => {
          errorContainer.classList.add("hidden");
        }, 3000);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const isNameValid =
    username.trim().length > 0 && username.trim().length <= 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 px-6 py-4 pt-12 sm:pt-24">
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: "#F97316" }}
            >
              Trivia on the go
            </h1>
            <p className="text-muted-foreground">
              Challenge friends in real-time trivia battles. Quick rounds, first
              to 5 wins.
            </p>
          </div>
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <Input
            ref={nameInputRef}
            id="username"
            type="text"
            placeholder="Enter a name to start"
            value={username}
            onChange={(e) => {
              if (e.target.value.length <= 10) {
                const value = e.target.value;
                // Capitalize first letter
                const capitalizedValue =
                  value.charAt(0).toUpperCase() + value.slice(1);
                setUsername(capitalizedValue);
              }
              setHighlightNameInput(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isNameValid) {
                createGame();
              }
            }}
            className={`w-full px-4 py-3 rounded-xl text-lg transition-all duration-300 ${
              highlightNameInput
                ? "border-2 border-orange-400 ring-2 ring-orange-200"
                : "border border-border"
            }`}
            maxLength={10}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={createGame}
            disabled={isCreating}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {isCreating ? "Creating..." : "Create Game"}
          </Button>

          <Button
            onClick={() => {
              if (!username.trim()) {
                setHighlightNameInput(true);
                nameInputRef.current?.focus();
                setTimeout(() => setHighlightNameInput(false), 2000);
                return;
              }
              setShowJoinSection(!showJoinSection);
            }}
            variant="outline"
            disabled={isJoining}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5" />
            Join Game
          </Button>
        </div>

        {/* Expandable Join Section */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showJoinSection ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-card/50 rounded-2xl p-6 space-y-4 mt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Ask your friend for the 4-digit code
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0000"
                  value={gameCode}
                  onChange={(e) =>
                    setGameCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      joinGame();
                    }
                  }}
                  className="w-full text-center text-2xl font-bold py-4 px-6 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p
                  id="join-error"
                  className="text-red-500 text-sm text-center hidden"
                ></p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setShowJoinSection(false);
                    setGameCode("");
                  }}
                  variant="outline"
                  className="flex-1 py-3 px-4 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={joinGame}
                  disabled={!gameCode || gameCode.length !== 4 || isJoining}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold"
                >
                  {isJoining ? "Joining..." : "Join"}
                </Button>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
