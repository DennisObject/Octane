import { useCallback, useEffect, useState } from 'react';

// Counts down a server-imposed wait (HTTP 429 Retry-After) in whole seconds.
export const useCooldown = () =>
{
    const [until, setUntil] = useState(0);
    const [remaining, setRemaining] = useState(0);

    useEffect(() =>
    {
        if (!until) return;

        const tick = () =>
        {
            const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));

            setRemaining(seconds);
            if (!seconds) setUntil(0);
        };

        tick();

        const timer = window.setInterval(tick, 1000);

        return () => window.clearInterval(timer);
    }, [until]);

    const start = useCallback((seconds: number) => setUntil(Date.now() + seconds * 1000), []);

    return { active: remaining > 0, remaining, start };
};
