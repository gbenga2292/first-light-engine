import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, Globe, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface LoginRecord {
  id: string;
  timestamp: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  loginType?: 'password' | 'magic_link' | 'oauth';
}

interface LoginHistoryCardProps {
  isLoading?: boolean;
}

export const LoginHistoryCard: React.FC<LoginHistoryCardProps> = ({ isLoading = false }) => {
  const { currentUser, getLoginHistory } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const loadLoginHistory = async () => {
    if (!currentUser?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const history = await getLoginHistory(currentUser.id);
      setLoginHistory(history || []);
    } catch (error) {
      console.error('Failed to load login history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getDeviceIcon = (deviceInfo?: string) => {
    if (!deviceInfo) return <Globe className="h-4 w-4" />;
    if (deviceInfo.toLowerCase().includes('mobile')) return <Smartphone className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getLoginTypeColor = (type?: string) => {
    switch (type) {
      case 'password':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'magic_link':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'oauth':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-sm border-white/10 hover:shadow-lg transition-all duration-300">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent" />

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-600" />
          Login History
        </CardTitle>
        <CardDescription>
          Recent devices and locations that accessed your account
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loginHistory.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No login history available
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loginHistory.slice(0, 5).map((login, idx) => (
              <div
                key={login.id || idx}
                className="flex items-start gap-4 p-4 bg-background/40 rounded-lg border border-border/50 hover:bg-background/60 transition-colors"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                  {getDeviceIcon(login.deviceInfo)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {login.deviceInfo || 'Unknown Device'}
                    </p>
                    <Badge variant="outline" className={`text-xs ${getLoginTypeColor(login.loginType)}`}>
                      {login.loginType === 'password' && 'Password'}
                      {login.loginType === 'magic_link' && 'Magic Link'}
                      {login.loginType === 'oauth' && 'OAuth'}
                      {!login.loginType && 'Standard'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {login.ipAddress && (
                      <>
                        <span>IP: {login.ipAddress}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(login.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  {login.location && (
                    <p className="text-xs text-muted-foreground">
                      📍 {login.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loginHistory.length > 0 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            disabled={isLoading || isLoadingHistory}
            onClick={loadLoginHistory}
          >
            Refresh
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginHistoryCard;
