import { EditEventMessageComposer } from '@volt/renderer';
import { FC, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useNativeTextSampling } from '../../../../../common/native-text/NativeTextScale';
import { useAirFieldWidth } from '../../../../achievements/AchievementText';
import { RoomPromoteEditSurface, RoomPromoteEditSurfaceState, RoomPromoteFieldReceipt, RoomPromoteFieldFill } from '../RoomPromoteEditSurface';
import { RoomPromoteField } from '../RoomPromoteField';

interface RoomPromoteEditWidgetViewProps {
    eventId: number;
    eventName: string;
    eventDescription: string;
    onClose: () => void;
}

// RoomEventViewCtrl (iro_event_settings_xml): a 241x191 frame with the event name (25 characters) and description (100 characters).
// The window has no save button: leaving a field saves the event, and an event name of 2 characters or fewer is refused.
const NAME_LENGTH = 25;
const DESCRIPTION_LENGTH = 100;
const MIN_NAME_LENGTH = 3;
const FRAME_WIDTH = 241;
// The frame's header box sits 6px inside the 241px card on each side (the caption is placed relative to it).
const HEADER_INSET = 6;

export const RoomPromoteEditWidgetView: FC<RoomPromoteEditWidgetViewProps> = ({ eventId, eventName, eventDescription, onClose }) => {
    const [name, setName] = useState<string>(eventName);
    const [description, setDescription] = useState<string>(eventDescription);
    const [hasNameError, setHasNameError] = useState<boolean>(false);
    const [focusedField, setFocusedField] = useState<'name' | 'description' | null>(null);
    const [surface, setSurface] = useState<RoomPromoteEditSurfaceState>({ drawn: false, name: null, description: null });
    // The fractional-DPR surface exists only at a fractional device pixel ratio; integer ratios keep the DOM window and the native shadow canvas.
    const isFractional = useNativeTextSampling(true) === 'auto';
    // A drawn surface counts only while the ratio is still fractional, so an integer ratio never hides the DOM window for a render with the surface already gone.
    const isSurfaceDrawn = isFractional && surface.drawn;
    const lastSaved = useRef<string>(JSON.stringify([eventName, eventDescription]));
    const caption = LocalizeText('navigator.eventsettings.editcaption');
    // Measured against the official window: for this 241px frame the caption lands one pixel left of the centred field (field = AIR field width, floor(textWidth) + 5), i.e. at floor((240 - field) / 2).
    // One native pair only (the header lays its title out through an item list); the rule is not pinned in the source.
    const captionWidth = useAirFieldWidth(caption, 12, true, 'u_frame_title');
    const captionLeft = captionWidth === undefined ? undefined : Math.floor((FRAME_WIDTH - 1 - captionWidth) / 2) - HEADER_INSET;
    const nameFill: RoomPromoteFieldFill = hasNameError ? 'yellow' : 'white';
    // A field hides its own browser text only while the surface really shows exactly this text on this fill.
    const ownsText = (receipt: RoomPromoteFieldReceipt | null, value: string, fill: RoomPromoteFieldFill): boolean | undefined =>
        isSurfaceDrawn ? !!receipt && receipt.fits && receipt.text === value && receipt.fill === fill : undefined;

    const save = (nextName: string, nextDescription: string) => {
        if (nextName.trim().length < MIN_NAME_LENGTH) {
            setHasNameError(true);

            return;
        }

        setHasNameError(false);

        // The server answers an edit with the updated event; an unchanged pair of fields is not sent again.
        const key = JSON.stringify([nextName, nextDescription]);

        if (key === lastSaved.current) return;

        lastSaved.current = key;
        SendMessageComposer(new EditEventMessageComposer(eventId, nextName, nextDescription));
    };

    return (
        <VoltCardView
            aria-label={caption}
            className={`volt-room-promote-edit${isSurfaceDrawn ? ' is-native-surface' : ''}`}
            dragStyle={isSurfaceDrawn ? { filter: 'none' } : undefined}
            frameStyle={3}
            isResizable={false}
            nativeShadow
            role="dialog"
            uniqueKey="room-promote-edit"
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <NativeText
                    background={0x377998}
                    className="volt-room-promote-edit__title"
                    nativeResolution
                    overrides={{ color: 0xffffff }}
                    style={captionLeft === undefined ? undefined : { left: captionLeft, transform: 'none' }}
                    text={caption}
                    textStyle="u_frame_title"
                />
            </VoltCardHeaderView>
            {isFractional && (
                <RoomPromoteEditSurface
                    caption={caption}
                    captionLeft={captionLeft}
                    description={description}
                    descriptionLabel={LocalizeText('navigator.eventsettings.desc')}
                    focusedField={focusedField}
                    hasNameError={hasNameError}
                    name={name}
                    nameLabel={LocalizeText('navigator.eventsettings.name')}
                    onStateChange={setSurface}
                />
            )}
            <div className="volt-room-promote-edit__client">
                <div className="volt-room-promote-edit__label" style={{ top: 4 }}>
                    <NativeText background={0xe9e9e1} nativeResolution text={LocalizeText('navigator.eventsettings.name')} textStyle="u_bold" />
                </div>
                {hasNameError && <div className="volt-room-promote-edit__error">{LocalizeText('navigator.eventsettings.nameerr')}</div>}
                <RoomPromoteField
                    isEditing={focusedField === 'name'}
                    isError={hasNameError}
                    label={LocalizeText('navigator.eventsettings.name')}
                    maxLength={NAME_LENGTH}
                    surfaceOwnsText={ownsText(surface.name, name, nameFill)}
                    value={name}
                    y={20}
                    height={15}
                    onBlur={() => save(name, description)}
                    onChange={setName}
                    onEditingChange={(editing) => setFocusedField((current) => (editing ? 'name' : current === 'name' ? null : current))}
                />
                <div className="volt-room-promote-edit__label" style={{ top: 40 }}>
                    <NativeText background={0xe9e9e1} nativeResolution text={LocalizeText('navigator.eventsettings.desc')} textStyle="u_bold" />
                </div>
                <RoomPromoteField
                    height={88}
                    isEditing={focusedField === 'description'}
                    label={LocalizeText('navigator.eventsettings.desc')}
                    maxLength={DESCRIPTION_LENGTH}
                    multiline
                    surfaceOwnsText={ownsText(surface.description, description, 'white')}
                    value={description}
                    y={56}
                    onBlur={() => save(name, description)}
                    onChange={setDescription}
                    onEditingChange={(editing) => setFocusedField((current) => (editing ? 'description' : current === 'description' ? null : current))}
                />
            </div>
        </VoltCardView>
    );
};
