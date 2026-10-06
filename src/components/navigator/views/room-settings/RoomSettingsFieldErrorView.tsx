import { FC } from 'react';
import { createPortal } from 'react-dom';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';
import { RoomSettingsInputErrorView } from './RoomSettingsInputErrorView';

export interface RoomSettingsFieldError {
    field: 'name' | 'description' | 'tags' | 'password' | 'confirm';
    message: string;
    // Tag errors belong to the field(s) whose text equals this (lower-case, without #).
    tagText?: string;
}

interface RoomSettingsFieldErrorViewProps {
    overlayNode: HTMLElement;
    x: number;
    y: number;
    w: number;
    h: number;
    message: string;
}

// Qd/nav_error_popup above a text field. It is drawn in the window-level overlay so the scrolling tab viewport cannot clip it.
export const RoomSettingsFieldErrorView: FC<RoomSettingsFieldErrorViewProps> = ({ overlayNode, x, y, w, h, message }) => {
    if (!overlayNode) return null;

    return createPortal(
        <NavigatorRoomSettingsAtView h={h} w={w} x={x} y={y}>
            <RoomSettingsInputErrorView message={message} />
        </NavigatorRoomSettingsAtView>,
        overlayNode
    );
};
