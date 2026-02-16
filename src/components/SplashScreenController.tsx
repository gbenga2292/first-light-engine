import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAssets } from '@/contexts/AssetsContext';
import { useWaybills } from '@/contexts/WaybillsContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useDashboardLoading } from '@/contexts/DashboardLoadingContext';
import { logger } from '@/lib/logger';

export const SplashScreenController = () => {
    const { isLoading: isAssetsLoading } = useAssets();
    const { isLoading: isWaybillsLoading } = useWaybills();
    const { isLoading: isAppDataLoading } = useAppData();
    const { isAllDataLoaded: isDashboardDataLoaded } = useDashboardLoading();

    const hasHiddenRef = useRef(false);
    const [showWebLoader, setShowWebLoader] = useState(true);

    useEffect(() => {
        const checkAndHideSplash = async () => {
            const platform = Capacitor.getPlatform();
            const isNative = platform === 'android' || platform === 'ios';

            if (hasHiddenRef.current) return;

            // Wait for both context data AND dashboard page data to be loaded
            const isAllDataLoaded = !isAssetsLoading && !isWaybillsLoading && !isAppDataLoading && isDashboardDataLoaded;

            if (isAllDataLoaded) {
                hasHiddenRef.current = true;

                if (isNative) {
                    try {
                        // Small buffer to ensure rendering is complete
                        await new Promise(resolve => setTimeout(resolve, 300));
                        await SplashScreen.hide({ fadeOutDuration: 300 });
                        logger.info('Splash screen hidden - All data loaded');
                    } catch (e) {
                        logger.warn('Failed to hide splash screen', e);
                    }
                } else {
                    // For web/Electron, hide the custom loader
                    setTimeout(() => setShowWebLoader(false), 300);
                    logger.info('Web loader hidden - All data loaded');
                }
            } else {
                logger.info('Waiting for data to load before hiding splash screen', {
                    data: {
                        contextAssets: isAssetsLoading,
                        contextWaybills: isWaybillsLoading,
                        contextAppData: isAppDataLoading,
                        dashboardData: !isDashboardDataLoaded
                    }
                });
            }
        };

        checkAndHideSplash();
    }, [isAssetsLoading, isWaybillsLoading, isAppDataLoading, isDashboardDataLoaded]);

    // Only show web loader on non-native platforms
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'android' || platform === 'ios';

    if (!isNative && showWebLoader) {
        return (
            <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
                    <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        Loading...
                    </h2>
                    <p className="text-muted-foreground">Preparing your dashboard</p>
                </div>
            </div>
        );
    }

    return null;
};
