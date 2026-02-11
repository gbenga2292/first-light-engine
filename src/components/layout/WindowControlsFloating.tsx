import React, { useEffect, useState } from 'react';
import { WindowControls } from '@/components/ui/window-controls';

export const WindowControlsFloating: React.FC<{ className?: string }> = ({ className }) => {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!(window as any).electronAPI);
  }, []);

  if (!isElectron) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-[28px] md:hidden ${className || ''}`}>
      {/* Fully transparent draggable title bar for mobile - no background, no border */}
      <div className="flex items-center justify-between h-full">
        {/* Left: Invisible draggable area - takes up most of the space */}
        <div className="flex-1 app-drag-region" />

        {/* Right: Window controls only */}
        <div className="app-no-drag">
          <WindowControls className="h-full" />
        </div>
      </div>
    </div>
  );
};
