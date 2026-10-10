import {
    AvatarEffectActivatedEvent, AvatarEffectAddedEvent, AvatarEffectExpiredEvent, AvatarEffectsEvent, GetCommunication, VoltEventType
} from '@volt/renderer';
import { useState } from 'react';
import { useMessageEvent, useVoltEvent } from '../events';

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

const NO_EFFECTS: AvatarEditorEffect[] = [];

/**
 * The effects of the signed-in session. The server sends the list right after AuthenticationOK, before the user identity, so the list belongs to the
 * authenticated connection: it is dropped when the connection stops being authenticated (logout, user change, reconnect) and the next login sends
 * it again. Nothing received on the current connection is ever cleared by an identity change.
 */
export const useAvatarEditorEffects = () =>
{
    const [effects, setEffects] = useState<AvatarEditorEffect[]>(NO_EFFECTS);
    const [wornEffect, setWornEffect] = useState(-1);

    useVoltEvent(VoltEventType.CONNECTION_STATE_CHANGED, () =>
    {
        if (GetCommunication().connection.connectionState.authenticated) return;

        setEffects(NO_EFFECTS);
        setWornEffect(-1);
    });

    useMessageEvent<AvatarEffectsEvent>(AvatarEffectsEvent, (event) =>
    {
        const updatedAt = Date.now();
        const incoming = event.getParser().effects.map(effect => ({
            type: effect.type, duration: effect.duration,
            amount: effect.inactiveEffectsInInventory + (effect.secondsLeftIfActive >= 0 ? 1 : 0),
            // class_1951.onAvatarEffects: only the exact -1 sentinel means inactive with a full duration; any other negative keeps the zero default.
            secondsLeft: effect.secondsLeftIfActive >= 0 ? effect.secondsLeftIfActive : effect.secondsLeftIfActive === -1 ? effect.duration : 0,
            active: effect.secondsLeftIfActive >= 0,
            permanent: effect.isPermanent, updatedAt
        }));
        setEffects(current =>
        {
            const next = [...current];

            for (const effect of incoming)
            {
                const index = next.findIndex(item => item.type === effect.type);
                if (index < 0) next.push(effect);
                else next[index] = { ...next[index], amount: next[index].amount + 1 };
            }

            return next;
        });
    });

    useMessageEvent<AvatarEffectAddedEvent>(AvatarEffectAddedEvent, (event) =>
    {
        const parser = event.getParser();
        setEffects(current => current.some(effect => effect.type === parser.type)
            ? current.map(effect => effect.type === parser.type ? { ...effect, amount: effect.amount + 1 } : effect)
            : [...current, { type: parser.type, duration: parser.duration, amount: 1, secondsLeft: parser.duration,
                active: false, permanent: parser.isPermanent, updatedAt: Date.now() }]);
    });

    useMessageEvent<AvatarEffectActivatedEvent>(AvatarEffectActivatedEvent, (event) =>
    {
        const parser = event.getParser();
        setEffects(current => current.map(effect => effect.type === parser.type && !effect.active
            ? { ...effect, active: true, updatedAt: Date.now() }
            : effect));
    });

    useMessageEvent<AvatarEffectExpiredEvent>(AvatarEffectExpiredEvent, (event) =>
    {
        const type = event.getParser().type;
        setEffects(current => current.flatMap(effect => effect.type !== type ? [effect]
            : effect.amount > 1 ? [{ ...effect, amount: effect.amount - 1, active: false, secondsLeft: effect.duration }] : []));
        setWornEffect(-1);
    });

    return { effects, wornEffect, setWornEffect };
};
