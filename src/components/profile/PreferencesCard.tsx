import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Sun, Monitor, Bell, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface PreferencesCardProps {
  isLoading?: boolean;
}

export const PreferencesCard: React.FC<PreferencesCardProps> = ({ isLoading = false }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    lowStockAlerts: true,
    waybillUpdates: true,
    weeklyReport: false,
  });

  const handleThemeChange = (value: string) => {
    setThemeState(value as 'light' | 'dark' | 'system');
    localStorage.setItem('theme', value);

    // Apply theme to document
    const htmlElement = document.documentElement;
    if (value === 'dark') {
      htmlElement.classList.add('dark');
    } else if (value === 'light') {
      htmlElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    }

    toast.success(`Theme changed to ${value}`);
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast.success('Preferences updated');
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-sm border-white/10 hover:shadow-lg transition-all duration-300">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-green-600" />
          Preferences & Settings
        </CardTitle>
        <CardDescription>
          Customize your experience and notification preferences
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Appearance Section */}
        <div className="space-y-4 pb-6 border-b border-border/50">
          <div>
            <h4 className="font-semibold mb-3">Appearance</h4>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
                <div className="flex items-center gap-3">
                  {getThemeIcon()}
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">
                      Choose your preferred theme
                    </p>
                  </div>
                </div>
                <Select value={theme} onValueChange={handleThemeChange} disabled={isLoading}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h4 className="font-semibold">Notifications</h4>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Receive important updates via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Show alerts within the application
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppNotifications}
              onCheckedChange={(value) => handlePreferenceChange('inAppNotifications', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Low Stock Alerts</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Notify when inventory is running low
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.lowStockAlerts}
              onCheckedChange={(value) => handlePreferenceChange('lowStockAlerts', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Waybill Status Updates</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Get notified about waybill changes
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.waybillUpdates}
              onCheckedChange={(value) => handlePreferenceChange('waybillUpdates', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Weekly Report</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Receive weekly inventory reports
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.weeklyReport}
              onCheckedChange={(value) => handlePreferenceChange('weeklyReport', value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isLoading}
          onClick={() => {
            try {
              localStorage.setItem('user_preferences', JSON.stringify(preferences));
              toast.success('Preferences saved');
            } catch (e) {
              toast.error('Failed to save preferences');
            }
          }}
        >
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesCard;
