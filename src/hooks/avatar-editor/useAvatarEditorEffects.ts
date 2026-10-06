import {
    AvatarEffectActivatedEvent, AvatarEffectAddedEvent, AvatarEffectExpiredEvent, AvatarEffectsEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { useMessageEvent } from '../events';

export interface AvatarEditorEffect {
    type: number;
    duration: number;
    amount: number;
    secondsLeft: number;
    active: boolean;
    permanent: boolean;
    updatedAt: number;
}

export const getEditorEffectSeconds = (effect: AvatarEditorEffect) => effect.active
    ? Math.max(0, effect.secondsLeft - Math.floor((Date.now() - effect.updatedAt) / 1000))
    : effect.duration;

export const useAvatarEditorEffects = (userId: number) => {
    const [effects, setEffects] = useState<AvatarEditorEffect[]>([]);
    const [wornEffect, setWornEffect] = useState(-1);
    const previousUserId = useRef(userId);

    useMessageEvent<AvatarEffectsEvent>(AvatarEffectsEvent, (event) => {
        const updatedAt = Date.now();
        const incoming = event.getParser().effects.map(effect => ({
            type: effect.type, duration: effect.duration,
            amount: effect.inactiveEffectsInInventory + (effect.secondsLeftIfActive >= 0 ? 1 : 0),
            secondsLeft: effect.secondsLeftIfActive >= 0 ? effect.secondsLeftIfActive : effect.duration,
            active: effect.secondsLeftIfActive >= 0,
            permanent: effect.isPermanent, updatedAt
        }));
        setEffects(current => {
            const next = [...current];

            for (const effect of incoming) {
                const index = next.findIndex(item => item.type === effect.type);
                if (index < 0) next.push(effect);
                else next[index] = { ...next[index], amount: next[index].amount + 1 };
            }

            return next;
        });
    });

    useMessageEvent<AvatarEffectAddedEvent>(AvatarEffectAddedEvent, (event) => {
        const parser = event.getParser();
        setEffects(current => current.some(effect => effect.type === parser.type)
            ? current.map(effect => effect.type === parser.type ? { ...effect, amount: effect.amount + 1 } : effect)
            : [...current, { type: parser.type, duration: parser.duration, amount: 1, secondsLeft: parser.duration,
                active: false, permanent: parser.isPermanent, updatedAt: Date.now() }]);
    });

    useMessageEvent<AvatarEffectActivatedEvent>(AvatarEffectActivatedEvent, (event) => {
        const parser = event.getParser();
        setEffects(current => current.map(effect => effect.type === parser.type && !effect.active
            ? { ...effect, active: true, updatedAt: Date.now() }
            : effect));
    });

    useMessageEvent<AvatarEffectExpiredEvent>(AvatarEffectExpiredEvent, (event) => {
        const type = event.getParser().type;
        setEffects(current => current.flatMap(effect => effect.type !== type ? [effect]
            : effect.amount > 1 ? [{ ...effect, amount: effect.amount - 1, active: false, secondsLeft: effect.duration }] : []));
        setWornEffect(-1);
    });

    useEffect(() => {
        // The first authenticated identity can arrive in the same batch as the effects list.
        if (!userId || (previousUserId.current && previousUserId.current !== userId)) {
            setEffects([]);
            setWornEffect(-1);
        }

        previousUserId.current = userId;
    }, [userId]);

    return { effects, wornEffect, setWornEffect };
};
