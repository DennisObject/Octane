import { GetEventDispatcher, VoltToolbarAnimateIconEvent } from '@volt/renderer';

export const CreateTransitionToIcon = (image: HTMLImageElement, fromElement: HTMLElement, icon: string) => {
    const bounds = fromElement.getBoundingClientRect();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const event = new VoltToolbarAnimateIconEvent(image, x, y);

    event.iconName = icon;

    GetEventDispatcher().dispatchEvent(event);
};
