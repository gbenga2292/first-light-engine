import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PinLockScreen } from '@/components/PinLockScreen';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

const supabase = supabaseClient as any;

const PIN_UNLOCKED_KEY = 'pin_unlocked';

/**
 * Wraps children with a PIN lock screen.
 * On app reopen (sessionStorage cleared), if the user has a PIN set,
 * the lock screen is shown until the correct PIN is entered.
 */
export const PinLockGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      setChecking(false);
      setIsLocked(false);
      return;
    }

    // If already unlocked this session, skip
    if (sessionStorage.getItem(PIN_UNLOCKED_KEY) === 'true') {
      setChecking(false);
      setIsLocked(false);
      return;
    }

    // Check if user has a PIN set
    const checkPin = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('id', currentUser.id)
          .single();

        if (data?.pin_hash) {
          setIsLocked(true);
        } else {
          // No PIN set, mark as unlocked
          sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
        }
      } catch {
        // On error, don't lock
        sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
      } finally {
        setChecking(false);
      }
    };

    checkPin();
  }, [isAuthenticated, currentUser?.id]);

  const handleUnlock = () => {
    sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
    setIsLocked(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(PIN_UNLOCKED_KEY);
    logout();
  };

  if (checking && isAuthenticated) {
    // Show nothing while checking PIN status to avoid flash
    return null;
  }

  if (isLocked && isAuthenticated) {
    return (
      <PinLockScreen
        onUnlock={handleUnlock}
        onLogout={handleLogout}
        userName={currentUser?.name}
        avatarLetter={currentUser?.name?.charAt(0)?.toUpperCase()}
      />
    );
  }

  return <>{children}</>;
};
