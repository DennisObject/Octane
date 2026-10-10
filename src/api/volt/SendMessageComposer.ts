import { GetCommunication, IMessageComposer } from '@volt/renderer';

export const SendMessageComposer = (event: IMessageComposer<unknown[]>) => GetCommunication().connection.send(event);
