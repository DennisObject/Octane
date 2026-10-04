import { useCallback, useEffect, useState } from 'react';

// The official login shows an error balloon for three seconds, then hides it.
export const NOTICE_DURATION_MS = 3000;

export const useTimedNotice = () =>
{
    const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);

    useEffect(() =>
    {
        if (!notice) return;

        const timer = window.setTimeout(() => setNotice(null), NOTICE_DURATION_MS);

        return () => window.clearTimeout(timer);
    }, [notice]);

    const show = useCallback((text: string) => setNotice({ text, id: Date.now() }), []);
    const clear = useCallback(() => setNotice(null), []);

    return { notice: notice?.text ?? null, noticeId: notice?.id ?? 0, show, clear };
};
