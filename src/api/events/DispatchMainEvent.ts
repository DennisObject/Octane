import { GetEventDispatcher, VoltEvent } from '@volt/renderer';
import { DispatchEvent } from './DispatchEvent';

export const DispatchMainEvent = (event: VoltEvent) => DispatchEvent(GetEventDispatcher(), event);
