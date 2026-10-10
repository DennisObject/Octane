import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../../common';

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
        <VoltCardView
            className="volt-ros-confirm"
            frameStyle={3}
            isResizable={false}
            offsetLeft={-0.5}
            offsetTop={-0.5}
            uniqueKey="volt-room-settings-confirm"
        >
            <VoltCardHeaderView headerText={title} onCloseClick={onClose} />
            <VoltCardContentView className="volt-ros-confirm-content" gap={0}>
                <div className="ros-confirm-message">{message}</div>
                <div className="ros-at" style={{ left: 5, top: 129, width: 199, height: 29 }}>
                    <button type="button" className="ros-button ros-button-red" onClick={onConfirm}>
                        {LocalizeText('generic.ok')}
                    </button>
                </div>
            </VoltCardContentView>
        </VoltCardView>
    );
};
