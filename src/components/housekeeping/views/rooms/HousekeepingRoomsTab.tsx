import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm, useRoom } from '../../../../hooks';
import { HousekeepingNumberInput } from '../HousekeepingNumberInput';

export const HousekeepingRoomsTab: FC = () => {
    const { selectedRoom, setSelectedRoom, lookupRoomById, isRoomLoading, isActionPending, setRoomOpen, setRoomMuted, kickAllFromRoom, transferRoomOwnership, deleteRoom } =
        useHousekeeping();
    const { roomSession = null } = useRoom();
    const confirm = useHousekeepingConfirm();
    const [roomIdDraft, setRoomIdDraft] = useState(0);
    const [newOwnerId, setNewOwnerId] = useState(0);
    const currentRoomId = roomSession?.roomId > 0 ? roomSession.roomId : 0;
    const disabled = !selectedRoom || isActionPending;

    const lookup = (roomId: number) => {
        if (roomId > 0 && !isRoomLoading) lookupRoomById(roomId);
    };

    const ask = (key: string, run: () => void, extra: [string[], string[]] = [[], []]) =>
        confirm(LocalizeText(key, ['room', ...extra[0]], [selectedRoom.name || `#${selectedRoom.id}`, ...extra[1]]), run);

    return (
        <>
            <div className="octane-staff-row" onKeyDown={(event) => event.key === 'Enter' && lookup(roomIdDraft)}>
                <HousekeepingNumberInput className="grow" label={LocalizeText('housekeeping.room.search.placeholder')} value={roomIdDraft} onChange={setRoomIdDraft} />
                <Button disabled={isRoomLoading || roomIdDraft <= 0} variant="secondary" onClick={() => lookup(roomIdDraft)}>
                    {LocalizeText('housekeeping.room.search.button')}
                </Button>
                {currentRoomId > 0 && (
                    <Button
                        disabled={isRoomLoading}
                        variant="secondary"
                        onClick={() => {
                            setRoomIdDraft(currentRoomId);
                            lookup(currentRoomId);
                        }}
                    >
                        {LocalizeText('housekeeping.room.current')}
                    </Button>
                )}
            </div>
            {selectedRoom ? (
                <StaffSection title={`${selectedRoom.name} (#${selectedRoom.id})`}>
                    <table className="octane-staff-table">
                        <tbody>
                            <tr>
                                <th>{LocalizeText('housekeeping.room.owner')}</th>
                                <td>
                                    {selectedRoom.ownerName || '-'} <span className="octane-staff-muted">#{selectedRoom.ownerId}</span>
                                </td>
                            </tr>
                            <tr>
                                <th>{LocalizeText('housekeeping.room.description')}</th>
                                <td className="truncate">{selectedRoom.description || '-'}</td>
                            </tr>
                            <tr>
                                <th>{LocalizeText('housekeeping.room.visitors')}</th>
                                <td>
                                    {selectedRoom.userCount} / {selectedRoom.maxUsers}
                                </td>
                            </tr>
                            <tr>
                                <th>{LocalizeText('housekeeping.user.status')}</th>
                                <td className="octane-staff-row">
                                    <span className={`octane-staff-flag ${selectedRoom.isLocked ? 'is-danger' : 'is-ok'}`}>
                                        {LocalizeText(selectedRoom.isLocked ? 'housekeeping.room.state.closed' : 'housekeeping.room.state.open')}
                                    </span>
                                    {selectedRoom.isMuted && <span className="octane-staff-flag is-danger">{LocalizeText('housekeeping.room.state.muted')}</span>}
                                    {selectedRoom.isPublic && <span className="octane-staff-flag is-muted">{LocalizeText('housekeeping.room.state.public')}</span>}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="octane-staff-row justify-end">
                        <Button variant="secondary" onClick={() => setSelectedRoom(null)}>
                            {LocalizeText('housekeeping.room.clear')}
                        </Button>
                    </div>
                </StaffSection>
            ) : (
                <StaffEmpty>{LocalizeText(isRoomLoading ? 'housekeeping.room.loading' : 'housekeeping.room.none')}</StaffEmpty>
            )}
            <StaffSection title={LocalizeText('housekeeping.section.room_actions')}>
                <div className="octane-staff-grid">
                    <Button disabled={disabled || !selectedRoom?.isLocked} variant="secondary" onClick={() => setRoomOpen(selectedRoom.id, true)}>
                        {LocalizeText('housekeeping.room.open')}
                    </Button>
                    <Button disabled={disabled || selectedRoom?.isLocked} variant="secondary" onClick={() => ask('housekeeping.room.close.confirm', () => setRoomOpen(selectedRoom.id, false))}>
                        {LocalizeText('housekeeping.room.close')}
                    </Button>
                    <Button disabled={disabled} variant="secondary" onClick={() => setRoomMuted(selectedRoom.id, !selectedRoom.isMuted)}>
                        {LocalizeText(selectedRoom?.isMuted ? 'housekeeping.room.unmute' : 'housekeeping.room.mute')}
                    </Button>
                </div>
                <div className="octane-staff-row">
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.room.transfer.new_owner')} value={newOwnerId} onChange={setNewOwnerId} />
                    <Button
                        classNames={['ml-auto']}
                        disabled={disabled || newOwnerId <= 0}
                        variant="secondary"
                        onClick={() => ask('housekeeping.room.transfer.confirm', () => transferRoomOwnership(selectedRoom.id, newOwnerId), [['id'], [String(newOwnerId)]])}
                    >
                        {LocalizeText('housekeeping.room.transfer')}
                    </Button>
                </div>
                <div className="octane-staff-grid">
                    <Button disabled={disabled} variant="danger" onClick={() => ask('housekeeping.room.kick_all.confirm', () => kickAllFromRoom(selectedRoom.id))}>
                        {LocalizeText('housekeeping.room.kick_all')}
                    </Button>
                    <Button disabled={disabled} variant="danger" onClick={() => ask('housekeeping.room.delete.confirm', () => deleteRoom(selectedRoom.id))}>
                        {LocalizeText('housekeeping.room.delete')}
                    </Button>
                </div>
            </StaffSection>
        </>
    );
};
