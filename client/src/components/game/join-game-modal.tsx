import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface JoinGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (code: string) => void;
}

export function JoinGameModal({ open, onOpenChange, onJoin }: JoinGameModalProps) {
  const [code, setCode] = useState(['', '', '', '']);
  const { toast } = useToast();

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleJoin = () => {
    const gameCode = code.join('');
    if (gameCode.length !== 4 || !/^\d{4}$/.test(gameCode)) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a valid 4-digit game code.",
      });
      return;
    }
    
    onJoin(gameCode);
    setCode(['', '', '', '']);
  };

  const handleCancel = () => {
    setCode(['', '', '', '']);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm rounded-2xl p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-slate-900">Join Game</DialogTitle>
          <p className="text-slate-600 mt-2">Enter the 4-digit game code</p>
        </DialogHeader>
        
        <div className="flex justify-center space-x-3 my-6">
          {code.map((digit, index) => (
            <Input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ))}
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl font-medium hover:bg-slate-200"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleJoin}
            className="flex-1 bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary/90"
          >
            Join
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
