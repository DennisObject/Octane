import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';

/** Visibility of the AIR `games_main` window; the player stays in their room while it is open. */
const useGameCenterState = () =>
{
    const [ isVisible, setIsVisible ] = useState<boolean>(false);

    return { isVisible, setIsVisible };
};

export const useGameCenter = () => useSharedHook(useGameCenterState);

registerSharedHook(useGameCenterState);
