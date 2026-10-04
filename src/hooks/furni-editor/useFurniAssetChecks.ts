import { useEffect, useState } from 'react';
import { AssetPresenceReport, checkAssetPresence } from './furniAssetPresence';
import { readAssetStateCount } from './furniAssetStates';

const STATE_COUNT_TRIES = 8;
const STATE_COUNT_RETRY_MS = 700;

/**
 * What the assets of a furni say: whether the icon and the bundle exist where
 * the renderer looks, and how many states the loaded asset defines. Results
 * are keyed by classname, so a slow answer for the previous furni is ignored.
 */
export const useFurniAssetChecks = (classname: string) => {
    const [stateCount, setStateCount] = useState<{ classname: string; count: number } | null>(null);
    const [presence, setPresence] = useState<{ classname: string; report: AssetPresenceReport } | null>(null);

    // The count is read once the room engine has the furni loaded (the preview
    // triggers that); the loader has no completion hook, so it is retried.
    useEffect(() => {
        let tries = 0;
        let handle = 0;

        const attempt = () => {
            const count = readAssetStateCount(classname);

            if (count !== null) {
                setStateCount({ classname, count });
                return;
            }

            if (++tries < STATE_COUNT_TRIES) handle = window.setTimeout(attempt, STATE_COUNT_RETRY_MS);
        };

        handle = window.setTimeout(attempt, 0);

        return () => window.clearTimeout(handle);
    }, [classname]);

    useEffect(() => {
        const controller = new AbortController();

        void checkAssetPresence(classname, controller.signal).then((report) => {
            if (!controller.signal.aborted) setPresence({ classname, report });
        });

        return () => controller.abort();
    }, [classname]);

    return {
        assetStates: stateCount?.classname === classname ? stateCount.count : null,
        assets: presence?.classname === classname ? presence.report : null
    };
};
