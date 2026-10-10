import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffSection } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HousekeepingSanctionDraft } from './HousekeepingUserSanctionsView';

interface HousekeepingBulkActionsViewProps {
    draft: HousekeepingSanctionDraft;
}

/** Applies the drafted sanction to every user ticked in the search results. Always asks first. */
export const HousekeepingBulkActionsView: FC<HousekeepingBulkActionsViewProps> = ({ draft }) => {
    const { selectedUserIds, clearUserSelection, isActionPending, banUsersBulk, kickUsersBulk, muteUsersBulk } = useHousekeeping();
    const confirm = useHousekeepingConfirm('panel');

    if (!selectedUserIds.length) return null;

    const reason = draft.reason.trim() || LocalizeText('housekeeping.reason.default');
    const count = String(selectedUserIds.length);
    const ask = (label: string, run: () => void) => confirm(LocalizeText('housekeeping.bulk.confirm', ['action', 'count'], [label, count]), run);
    const banLabel = LocalizeText('housekeeping.action.ban_h', ['h'], [String(draft.banHours)]);
    const muteLabel = LocalizeText('housekeeping.action.mute_min', ['m'], [String(draft.muteMinutes)]);
    const kickLabel = LocalizeText('housekeeping.action.kick');

    return (
        <StaffSection title={LocalizeText('housekeeping.bulk.label', ['count'], [count])}>
            <div className="volt-staff-row flex-wrap">
                <Button disabled={isActionPending} variant="danger" onClick={() => ask(banLabel, () => banUsersBulk(selectedUserIds, reason, draft.banHours))}>
                    {banLabel}
                </Button>
                <Button disabled={isActionPending} variant="secondary" onClick={() => ask(muteLabel, () => muteUsersBulk(selectedUserIds, reason, draft.muteMinutes))}>
                    {muteLabel}
                </Button>
                <Button disabled={isActionPending} variant="secondary" onClick={() => ask(kickLabel, () => kickUsersBulk(selectedUserIds, reason))}>
                    {kickLabel}
                </Button>
                <Button classNames={['ml-auto']} variant="secondary" onClick={clearUserSelection}>
                    {LocalizeText('housekeeping.bulk.clear')}
                </Button>
            </div>
        </StaffSection>
    );
};
