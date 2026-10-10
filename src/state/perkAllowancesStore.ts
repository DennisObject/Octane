import { GetCommunication, PerkAllowancesMessageEvent } from '@volt/renderer';
import { createVoltStore } from './createVoltStore';

interface PerkAllowancesState
{
    allowed: ReadonlySet<string>;
}

export const usePerkAllowancesStore = createVoltStore<PerkAllowancesState>()(() => ({ allowed: new Set<string>() }));

export const usePerkAllowed = (code: string) => usePerkAllowancesStore(state => state.allowed.has(code));

export const clearPerkAllowances = () => usePerkAllowancesStore.setState({ allowed: new Set<string>() });

let listeningCommunication: ReturnType<typeof GetCommunication> | null = null;
let allowanceEvent: PerkAllowancesMessageEvent | null = null;

export const listenForPerkAllowances = () =>
{
    const communication = GetCommunication();

    clearPerkAllowances();

    if(listeningCommunication === communication) return;

    if(listeningCommunication && allowanceEvent) listeningCommunication.removeMessageEvent(allowanceEvent);

    allowanceEvent = new PerkAllowancesMessageEvent(event =>
    {
        const allowed = new Set<string>();

        for(const perk of event.getParser()?.perks ?? []) if(perk.isAllowed) allowed.add(perk.code);

        usePerkAllowancesStore.setState({ allowed });
    });
    listeningCommunication = communication;
    communication.registerMessageEvent(allowanceEvent);
};
