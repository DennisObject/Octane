import { EditEventMessageComposer } from '@octane/renderer';
import { FC, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
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

export const RoomPromoteEditWidgetView: FC<RoomPromoteEditWidgetViewProps> = ({ eventId, eventName, eventDescription, onClose }) => {
    const [name, setName] = useState<string>(eventName);
    const [description, setDescription] = useState<string>(eventDescription);
    const [hasNameError, setHasNameError] = useState<boolean>(false);
    const lastSaved = useRef<string>(JSON.stringify([eventName, eventDescription]));

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
        <OctaneCardView aria-label={LocalizeText('navigator.eventsettings.editcaption')} className="octane-room-promote-edit" frameStyle={3} isResizable={false} role="dialog" uniqueKey="room-promote-edit">
            <OctaneCardHeaderView headerText="" onCloseClick={onClose}>
                <NativeText background={0x377998} className="octane-room-promote-edit__title" overrides={{ color: 0xffffff }} text={LocalizeText('navigator.eventsettings.editcaption')} textStyle="u_frame_title" />
            </OctaneCardHeaderView>
            <div className="octane-room-promote-edit__client">
                <div className="octane-room-promote-edit__label" style={{ top: 4 }}>
                    <NativeText background={0xe9e9e1} overrides={{ sharpness: 0, thickness: 0 }} text={LocalizeText('navigator.eventsettings.name')} textStyle="u_bold" />
                </div>
                {hasNameError && <div className="octane-room-promote-edit__error">{LocalizeText('navigator.eventsettings.nameerr')}</div>}
                <RoomPromoteField
                    isError={hasNameError}
                    label={LocalizeText('navigator.eventsettings.name')}
                    maxLength={NAME_LENGTH}
                    value={name}
                    y={20}
                    height={15}
                    onBlur={() => save(name, description)}
                    onChange={setName}
                />
                <div className="octane-room-promote-edit__label" style={{ top: 40 }}>
                    <NativeText background={0xe9e9e1} overrides={{ sharpness: 0, thickness: 0 }} text={LocalizeText('navigator.eventsettings.desc')} textStyle="u_bold" />
                </div>
                <RoomPromoteField
                    height={88}
                    label={LocalizeText('navigator.eventsettings.desc')}
                    maxLength={DESCRIPTION_LENGTH}
                    multiline
                    value={description}
                    y={56}
                    onBlur={() => save(name, description)}
                    onChange={setDescription}
                />
            </div>
        </OctaneCardView>
    );
};
