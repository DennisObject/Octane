import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffSection } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';

/** Room-level sanctions for a user who is online, sent through the current room session. */
export const HousekeepingLiveActionsView: FC = () => {
    const { selectedUser, isActionPending, kickFromCurrentRoom, muteInCurrentRoom, banFromCurrentRoom } = useHousekeeping();
    const confirm = useHousekeepingConfirm();

    if (!selectedUser?.online) return null;

    const id = selectedUser.id;
    const confirmRoomBan = (severity: 'hour' | 'day') =>
        confirm(LocalizeText('housekeeping.confirm.room_ban', ['username'], [selectedUser.username || `#${id}`]), () => banFromCurrentRoom(id, severity));

    return (
        <StaffSection title={LocalizeText('housekeeping.user.live.label')}>
            <div className="octane-staff-row flex-wrap">
                <Button disabled={isActionPending} variant="secondary" onClick={() => kickFromCurrentRoom(id)}>
                    {LocalizeText('housekeeping.user.live.kick')}
                </Button>
                <Button disabled={isActionPending} variant="secondary" onClick={() => muteInCurrentRoom(id, 2)}>
                    {LocalizeText('housekeeping.user.live.mute_2m')}
                </Button>
                <Button disabled={isActionPending} variant="secondary" onClick={() => muteInCurrentRoom(id, 10)}>
                    {LocalizeText('housekeeping.user.live.mute_10m')}
                </Button>
                <Button disabled={isActionPending} variant="danger" onClick={() => confirmRoomBan('hour')}>
                    {LocalizeText('housekeeping.user.live.ban_h')}
                </Button>
                <Button disabled={isActionPending} variant="danger" onClick={() => confirmRoomBan('day')}>
                    {LocalizeText('housekeeping.user.live.ban_d')}
                </Button>
            </div>
        </StaffSection>
    );
};
