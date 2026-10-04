import { FC, useState } from 'react';
import { HousekeepingBulkActionsView } from './HousekeepingBulkActionsView';
import { HousekeepingLiveActionsView } from './HousekeepingLiveActionsView';
import { HousekeepingUserCardView } from './HousekeepingUserCardView';
import { HousekeepingUserSearchView } from './HousekeepingUserSearchView';
import { DEFAULT_SANCTION_DRAFT, HousekeepingSanctionDraft, HousekeepingUserSanctionsView } from './HousekeepingUserSanctionsView';

export const HousekeepingUsersTab: FC = () => {
    const [draft, setDraft] = useState<HousekeepingSanctionDraft>(DEFAULT_SANCTION_DRAFT);

    return (
        <>
            <HousekeepingUserSearchView />
            <HousekeepingBulkActionsView draft={draft} />
            <HousekeepingUserCardView />
            <HousekeepingLiveActionsView />
            <HousekeepingUserSanctionsView draft={draft} onDraftChange={setDraft} />
        </>
    );
};
