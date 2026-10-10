import { DesktopViewComposer } from '@volt/renderer';
import { SendMessageComposer } from '../SendMessageComposer';

export function GoToDesktop(): void {
    SendMessageComposer(new DesktopViewComposer());
}
