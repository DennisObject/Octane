import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect } from 'react';
import { useGameCenter, useSnowWar } from '../../hooks';

export const GameCenterView = () => {
    const { isVisible, setIsVisible } = useGameCenter();
    const { refreshStatus } = useSnowWar();

    useEffect(() => {
        const toggleGameCenter = () => {
            setIsVisible((prev) => !prev);
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                switch (value[1]) {
                    case 'toggle':
                        toggleGameCenter();
                        break;
                }
            },
            eventUrlPrefix: 'games/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible]);

    useEffect(() => {
        if (isVisible) refreshStatus();
    }, [isVisible, refreshStatus]);

    // The AIR games_main window renders here.
    return null;
};
