import { createVoltStore } from '../../state/createVoltStore';

// The AIR achievements window keeps one list scroll offset for the whole window: it survives switching category
// and hiding and showing the window, and is only clamped to the new content height. Read it with getState();
// nothing renders from it.
export const useAchievementListScrollStore = createVoltStore<{ scrollTop: number }>()(() => ({ scrollTop: 0 }));
