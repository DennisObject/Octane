import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { FriendsDialogBorderView, FriendsDialogButtonView, FriendsDialogFrameView, FriendsDialogSnapshot } from './FriendsListRoomInviteView';

interface FriendsRemoveConfirmationViewProps {
    snapshot: FriendsDialogSnapshot;
    removeSelectedFriends: (ids: number[]) => void;
    onCloseClick: () => void;
}

export const FriendsRemoveConfirmationView: FC<FriendsRemoveConfirmationViewProps> = ({ snapshot, removeSelectedFriends, onCloseClick }) => (
    <FriendsDialogFrameView kind="remove" title={LocalizeText('friendlist.removefriendconfirm.title')}
        initialPosition={snapshot.initialPosition} onCloseClick={onCloseClick}>
        <FriendsDialogBorderView width={150} height={143} />
        <div className="volt-friends-remove-confirmation-text">{snapshot.caption}</div>
        <div className="friends-dialog-actions">
            <FriendsDialogButtonView thick caption={LocalizeText('generic.ok')} onClick={() => removeSelectedFriends(snapshot.ids)} />
            <FriendsDialogButtonView caption={LocalizeText('generic.cancel')} onClick={onCloseClick} />
        </div>
    </FriendsDialogFrameView>
);
