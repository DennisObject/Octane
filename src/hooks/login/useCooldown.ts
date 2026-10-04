import { useCallback, useEffect, useState } from 'react';
import { AuthAction, useAuthCooldownStore } from './authCooldownStore';

const secondsLeft = (until: number): number => Math.max(0, Math.ceil((until - Date.now()) / 1000));

// Counts down the shared cooldown of one auth action in whole seconds.
export const useCooldown = (action: AuthAction) =>
{
    const until = useAuthCooldownStore((state) => state.until[action]);
    const startCooldown = useAuthCooldownStore((state) => state.start);
    const [remaining, setRemaining] = useState(() => secondsLeft(until));

    useEffect(() =>
    {
        let timer = 0;

        const tick = () =>
        {
            const left = secondsLeft(until);

            setRemaining(left);
            if (!left) window.clearInterval(timer);
        };

        // The first tick runs as a callback too, so a new cooldown shows at once.
        const first = window.setTimeout(tick, 0);

        timer = window.setInterval(tick, 1000);

        return () =>
        {
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, [until]);

    const start = useCallback((seconds: number) => startCooldown(action, seconds), [action, startCooldown]);

    return { active: remaining > 0, remaining, start };
};

export type Cooldown = ReturnType<typeof useCooldown>;
