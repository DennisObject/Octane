import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

interface NavigatorRoomSettingsConfirmViewProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

// v75 ros_confirm (mee): a frame with the message and a single OK; the close button cancels.
export const NavigatorRoomSettingsConfirmView: FC<NavigatorRoomSettingsConfirmViewProps> = (props) => {
    const { title, message, onConfirm, onClose } = props;

    return (
        <OctaneCardView className="octane-ros-confirm" frameStyle={3} isResizable={false} uniqueKey="octane-room-settings-confirm">
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardContentView className="octane-ros-confirm-content" gap={0}>
                <div className="ros-confirm-message">{message}</div>
                <div className="ros-at" style={{ left: 5, top: 129, width: 199, height: 29 }}>
                    <button type="button" className="ros-button ros-button-red" onClick={onConfirm}>
                        {LocalizeText('generic.ok')}
                    </button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
