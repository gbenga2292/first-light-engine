import React, { useState, useRef, useEffect } from 'react';
import { Lock, Fingerprint, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinLockScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
  userName?: string;
  avatarLetter?: string;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock, onLogout, userName, avatarLetter }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const maxLength = 4;

  const verifyPin = React.useCallback(async (enteredPin: string) => {
    try {
      const { default: bcrypt } = await import('bcryptjs');
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) {
        setError('Session expired');
        return;
      }

      const userId = JSON.parse(storedUser).id;
      let pinHash = localStorage.getItem(`pin_hash_${userId}`);

      // If we don't have a cached hash, try to fetch it
      if (!pinHash) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error: dbError } = await (supabase as any)
            .from('users')
            .select('pin_hash')
            .eq('id', userId)
            .single();

          if (!dbError && data?.pin_hash) {
            pinHash = data.pin_hash;
            // Cache it for future offline use
            localStorage.setItem(`pin_hash_${userId}`, pinHash!);
          } else if (dbError) {
            console.error('Error fetching PIN hash:', dbError);
          } else if (!data?.pin_hash) {
            onUnlock();
            return;
          }
        } catch (err) {
          console.error('Network error checking PIN:', err);
        }
      }

      if (!pinHash) {
        setError('OFFLINE: Cannot verify PIN. Connect to internet.');
        return;
      }

      const isMatch = await bcrypt.compare(enteredPin, pinHash);
      if (isMatch) {
        onUnlock();
      } else {
        setError('Incorrect PIN');
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 500);
      }
    } catch (e) {
      console.error('PIN verification error', e);
      setError('Verification failed');
      setPin('');
    }
  }, [onUnlock]);

  const handleDigit = React.useCallback((digit: string) => {
    setPin(prevPin => {
      if (prevPin.length >= maxLength) return prevPin;
      const newPin = prevPin + digit;

      if (newPin.length === maxLength) {
        setTimeout(() => verifyPin(newPin), 0);
      }
      return newPin;
    });
    setError('');
  }, [verifyPin]);

  const handleDelete = React.useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  // Add keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
      {/* User Avatar */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">
            {avatarLetter || '?'}
          </span>
        </div>
        {userName && (
          <p className="text-lg font-semibold text-foreground">{userName}</p>
        )}
      </div>

      {/* Lock Icon & Title */}
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Enter your PIN to unlock</p>
      </div>

      {/* PIN Dots */}
      <div className={cn("flex gap-4 my-6", isShaking && "animate-shake")}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 w-4 rounded-full border-2 transition-all duration-200",
              i < pin.length
                ? "bg-primary border-primary scale-110"
                : "border-muted-foreground/40"
            )}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="h-6 mb-4">
        {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 max-w-[280px]">
        {digits.map((digit, i) => {
          if (digit === '') return <div key={i} />;
          if (digit === 'delete') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <Delete className="h-6 w-6" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(digit)}
              className="h-16 w-16 mx-auto rounded-full border border-border bg-card hover:bg-accent active:bg-accent/80 flex items-center justify-center text-xl font-semibold text-foreground transition-colors"
            >
              {digit}
            </button>
          );
        })}
      </div>

      {/* Logout link */}
      <button
        onClick={onLogout}
        className="mt-8 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
      >
        Sign out instead
      </button>
    </div>
  );
};
