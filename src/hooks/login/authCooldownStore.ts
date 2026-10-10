import { createVoltStore } from '../../state/createVoltStore';

export type AuthAction = 'login' | 'register' | 'forgot';

interface AuthCooldownState {
    until: Record<AuthAction, number>;
    start: (action: AuthAction, seconds: number) => void;
}

// Server-imposed waits (HTTP 429) per auth action. Kept outside the screens so
// switching between Sign In, sign-up and the password reminder keeps them.
export const useAuthCooldownStore = createVoltStore<AuthCooldownState>()((set) => ({
    until: { login: 0, register: 0, forgot: 0 },
    start: (action, seconds) => set((state) => ({ until: { ...state.until, [action]: Date.now() + seconds * 1000 } }))
}));
