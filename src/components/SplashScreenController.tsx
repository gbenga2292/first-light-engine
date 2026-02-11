import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAssets } from '@/contexts/AssetsContext';
import { useWaybills } from '@/contexts/WaybillsContext';
import { useAppData } from '@/contexts/AppDataContext';
import { logger } from '@/lib/logger';

export const SplashScreenController = () => {
    const { isLoading: isAssetsLoading } = useAssets();
    const { isLoading: isWaybillsLoading } = useWaybills();
    const { isLoading: isAppDataLoading } = useAppData();

    const hasHiddenRef = useRef(false);

    useEffect(() => {
        const checkAndHideSplash = async () => {
            // Only run on native platforms
            const platform = Capacitor.getPlatform();
            const isNative = platform === 'android' || platform === 'ios';

            if (!isNative) return;
            if (hasHiddenRef.current) return;

            const isAllDataLoaded = !isAssetsLoading && !isWaybillsLoading && !isAppDataLoading;

            if (isAllDataLoaded) {
                hasHiddenRef.current = true;

                try {
                    // Small buffer to ensure rendering is complete
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await SplashScreen.hide({ fadeOutDuration: 300 });
                    logger.info('Splash screen hidden - All data loaded');
                } catch (e) {
                    logger.warn('Failed to hide splash screen', e);
                }
            } else {
                logger.info('Waiting for data to load before hiding splash screen', {
                    data: {
                        assets: isAssetsLoading,
                        waybills: isWaybillsLoading,
                        appData: isAppDataLoading
                    }
                });
            }
        };

        checkAndHideSplash();
    }, [isAssetsLoading, isWaybillsLoading, isAppDataLoading]);

    return null; // This component renders nothing
};
