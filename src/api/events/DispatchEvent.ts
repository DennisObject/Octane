import { IEventDispatcher, VoltEvent } from '@volt/renderer';

export const DispatchEvent = (eventDispatcher: IEventDispatcher, event: VoltEvent) => eventDispatcher.dispatchEvent(event);
