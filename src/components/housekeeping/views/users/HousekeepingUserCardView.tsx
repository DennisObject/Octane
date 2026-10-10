import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, LayoutAvatarImageView, LayoutCurrencyIcon, StaffEmpty, StaffSection } from '../../../../common';
import { useHousekeepingStore } from '../../../../hooks';

/** Selected user summary, laid out like the mod-tools user info: labels left, values right. */
export const HousekeepingUserCardView: FC = () => {
    const { selectedUser, setSelectedUser, isUserLoading } = useHousekeepingStore();

    if (!selectedUser) return <StaffEmpty>{LocalizeText(isUserLoading ? 'housekeeping.user.loading' : 'housekeeping.user.none')}</StaffEmpty>;

    return (
        <StaffSection title={`${selectedUser.username} (#${selectedUser.id})`}>
            <div className="volt-housekeeping-user">
                <div className="volt-housekeeping-user-head">
                    {selectedUser.figure && (
                        <LayoutAvatarImageView headOnly nativeCroppedHead trimmed classNames={['volt-housekeeping-user-head-image']} direction={2} figure={selectedUser.figure} />
                    )}
                </div>
                <table className="volt-staff-table volt-housekeeping-facts">
                    <tbody>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.motto')}</th>
                            <td className="truncate">{selectedUser.motto || '-'}</td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.rank')}</th>
                            <td>{selectedUser.rankName ? `${selectedUser.rankName} (${selectedUser.rank})` : selectedUser.rank || '-'}</td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.status')}</th>
                            <td className="volt-staff-row">
                                <span className={`volt-staff-flag ${selectedUser.online ? 'is-ok' : 'is-muted'}`}>
                                    {LocalizeText(selectedUser.online ? 'housekeeping.user.online' : 'housekeeping.user.offline')}
                                </span>
                                {selectedUser.isBanned && <span className="volt-staff-flag is-danger">{LocalizeText('housekeeping.user.banned')}</span>}
                                {selectedUser.isMuted && <span className="volt-staff-flag is-danger">{LocalizeText('housekeeping.user.muted')}</span>}
                                {selectedUser.isTradeLocked && <span className="volt-staff-flag is-danger">{LocalizeText('housekeeping.user.trade_locked')}</span>}
                            </td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.balance')}</th>
                            <td className="volt-staff-row volt-housekeeping-balance">
                                <span title={LocalizeText('housekeeping.user.credits')}>
                                    <LayoutCurrencyIcon type={-1} /> {selectedUser.creditsBalance.toLocaleString()}
                                </span>
                                <span title={LocalizeText('housekeeping.user.duckets')}>
                                    <LayoutCurrencyIcon type={0} /> {selectedUser.ducketsBalance.toLocaleString()}
                                </span>
                                <span title={LocalizeText('housekeeping.user.diamonds')}>
                                    <LayoutCurrencyIcon type={5} /> {selectedUser.diamondsBalance.toLocaleString()}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.email')}</th>
                            <td className={`truncate ${selectedUser.email ? '' : 'volt-staff-muted'}`}>{selectedUser.email || LocalizeText('housekeeping.user.hidden')}</td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('housekeeping.user.last_ip')}</th>
                            <td className={`truncate ${selectedUser.ipLast ? '' : 'volt-staff-muted'}`}>{selectedUser.ipLast || LocalizeText('housekeeping.user.hidden')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="volt-staff-row justify-end">
                <Button variant="secondary" onClick={() => setSelectedUser(null)}>
                    {LocalizeText('housekeeping.user.clear')}
                </Button>
            </div>
        </StaffSection>
    );
};
