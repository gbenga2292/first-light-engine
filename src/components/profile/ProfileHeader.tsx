import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProfileHeaderProps {
  onLogout: () => void;
  onAvatarChange?: (avatarData: string) => void;
}

const getRoleColor = (role: string | undefined) => {
  const colors: Record<string, { bg: string; text: string; gradient: string }> = {
    admin: { bg: 'bg-red-100', text: 'text-red-800', gradient: 'from-red-600 to-rose-600' },
    manager: { bg: 'bg-blue-100', text: 'text-blue-800', gradient: 'from-blue-600 to-indigo-600' },
    supervisor: { bg: 'bg-purple-100', text: 'text-purple-800', gradient: 'from-purple-600 to-indigo-600' },
    staff: { bg: 'bg-green-100', text: 'text-green-800', gradient: 'from-green-600 to-emerald-600' },
    default: { bg: 'bg-slate-100', text: 'text-slate-800', gradient: 'from-slate-600 to-blue-600' }
  };
  return colors[role as string] || colors.default;
};

const getRoleLabel = (role: string | undefined) => {
  if (!role) return 'User';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ onLogout, onAvatarChange }) => {
  const { currentUser } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleColors = getRoleColor(currentUser?.role);

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      localStorage.setItem(`avatar_${currentUser?.id}`, base64String);
      onAvatarChange?.(base64String);
      toast.success('Avatar updated successfully');
      setIsUploadingAvatar(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const lastActiveTime = currentUser?.lastActive 
    ? formatDistanceToNow(new Date(currentUser.lastActive), { addSuffix: true })
    : 'Never';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${roleColors.gradient} p-8 md:p-12 backdrop-blur-xl border border-white/10 shadow-2xl`}>
      {/* Glassmorphic Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-40" />
      <div className="absolute -top-20 -right-20 h-40 w-40 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-white/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {/* Avatar and Basic Info */}
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Avatar className="h-32 w-32 border-4 border-white/30 shadow-2xl relative">
                <AvatarImage src={localStorage.getItem(`avatar_${currentUser?.id}`) || currentUser?.avatar} />
                <AvatarFallback className="text-5xl bg-white/20 text-white font-bold">
                  {currentUser?.name?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full shadow-lg h-10 w-10 bg-white/90 hover:bg-white"
                onClick={handleAvatarUpload}
                disabled={isUploadingAvatar}
              >
                <Camera className="h-5 w-5 text-slate-700" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name and Role */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {currentUser?.name || currentUser?.username}
                </h1>
                <Badge className="bg-white/30 text-white border border-white/50 backdrop-blur text-sm md:text-base">
                  <Sparkles className="h-3 w-3 mr-2" />
                  {getRoleLabel(currentUser?.role)}
                </Badge>
              </div>
              <p className="text-white/80 text-sm md:text-base">
                @{currentUser?.username}
              </p>
              <p className="text-white/70 text-xs md:text-sm">
                Last active: {lastActiveTime}
              </p>
            </div>
          </div>

          {/* Actions */}
          <Button
            variant="secondary"
            size="lg"
            className="bg-white/90 text-slate-700 hover:bg-white shadow-lg self-start md:self-auto"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
