import { GetEventDispatcher, VoltEvent } from '@volt/renderer';
import { useEventDispatcher } from './useEventDispatcher';

export const useVoltEvent = <T extends VoltEvent>(type: string | string[], handler: (event: T) => void, enabled = true) =>
    useEventDispatcher(type, GetEventDispatcher(), handler, enabled);
