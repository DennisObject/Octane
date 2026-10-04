import { useCallback, useEffect, useRef } from 'react';

// One in-flight auth request per form. Starting a new one, or leaving the
// screen, aborts the previous request, so a late answer can neither store
// credentials nor move the player on.
export const useAbortableFlow = () =>
{
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => () => controllerRef.current?.abort(), []);

    return useCallback((): AbortSignal =>
    {
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        return controllerRef.current.signal;
    }, []);
};
