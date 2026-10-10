import { VoltEvent } from '@volt/renderer';
import { DispatchEvent } from './DispatchEvent';
import { UI_EVENT_DISPATCHER } from './UI_EVENT_DISPATCHER';

export const DispatchUiEvent = (event: VoltEvent) => DispatchEvent(UI_EVENT_DISPATCHER, event);
