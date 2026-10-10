import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useEffect, useMemo } from 'react';
import { Permission } from '../../api/permissions';
import { getHousekeepingMode, HousekeepingTabId, isHousekeepingEnabled, isHousekeepingTabAvailable, LocalizeText } from '../../api';
import { DraggableWindowPosition, StaffWindow, StaffWindowTab, WidgetErrorBoundary } from '../../common';
import { useHasPermission, useHousekeepingStore } from '../../hooks';
import { HousekeepingPasswordReveal } from './HousekeepingPasswordReveal';
import { HousekeepingStatusBanner } from './HousekeepingStatusBanner';
import { HousekeepingAuditTab } from './views/audit/HousekeepingAuditTab';
import { HousekeepingDashboardTab } from './views/dashboard/HousekeepingDashboardTab';
import { HousekeepingEconomyTab } from './views/economy/HousekeepingEconomyTab';
import { HousekeepingRoomsTab } from './views/rooms/HousekeepingRoomsTab';
import { HousekeepingRolesTab } from './views/roles/HousekeepingRolesTab';
import { HousekeepingUsersTab } from './views/users/HousekeepingUsersTab';

const TAB_ORDER: HousekeepingTabId[] = [
    HousekeepingTabId.DASHBOARD,
    HousekeepingTabId.USERS,
    HousekeepingTabId.ROOMS,
    HousekeepingTabId.ECONOMY,
    HousekeepingTabId.AUDIT,
    HousekeepingTabId.ROLES
];

const isTabId = (value: string): value is HousekeepingTabId => (TAB_ORDER as string[]).includes(value);

const decodeSegment = (segment: string = ''): string => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
};

const TabContent: FC<{ tab: HousekeepingTabId }> = ({ tab }) => {
    switch (tab) {
        case HousekeepingTabId.USERS:
            return <HousekeepingUsersTab />;
        case HousekeepingTabId.ROOMS:
            return <HousekeepingRoomsTab />;
        case HousekeepingTabId.ECONOMY:
            return <HousekeepingEconomyTab />;
        case HousekeepingTabId.ROLES:
            return <HousekeepingRolesTab />;
        case HousekeepingTabId.AUDIT:
            return <HousekeepingAuditTab />;
        default:
            return <HousekeepingDashboardTab />;
    }
};

/**
 * In-client housekeeping. Shown only while the server has granted `housekeeping.access`
 * (and `housekeeping.enabled` is on); that gate is cosmetic, the server authorises
 * every request again.
 *
 * Links: housekeeping/show|hide|toggle, housekeeping/tab/<id>,
 * housekeeping/user/<id>[/<name>/<figure>] (avatar menu).
 */
export const HousekeepingView: FC = () => {
    const { isVisible, openPanel, closePanel, togglePanel, activeTab, setActiveTab, lookupUserById, seedUserFromAvatar } = useHousekeepingStore();
    const canManageRoles = useHasPermission(Permission.HousekeepingRolesManage);
    const isHk = useHasPermission(Permission.HousekeepingAccess);
    const isEnabled = useMemo(() => isHousekeepingEnabled(), []);
    const mode = useMemo(() => getHousekeepingMode(), []);
    const isAllowed = isEnabled && isHk;

    const availableTabs = useMemo(
        () => TAB_ORDER.filter((tab) => isHousekeepingTabAvailable(tab, mode) && (tab !== HousekeepingTabId.ROLES || canManageRoles)),
        [mode, canManageRoles]
    );

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                if (!isAllowed) return;

                const parts = url.split('/');

                switch (parts[1]) {
                    case 'show':
                        openPanel();
                        return;
                    case 'hide':
                        closePanel();
                        return;
                    case 'toggle':
                        togglePanel();
                        return;
                    case 'tab':
                        if (isTabId(parts[2]) && availableTabs.includes(parts[2])) {
                            setActiveTab(parts[2]);
                            openPanel();
                        }
                        return;
                    case 'user': {
                        const userId = parseInt(parts[2]);

                        if (!Number.isInteger(userId) || userId <= 0 || !availableTabs.includes(HousekeepingTabId.USERS)) return;

                        setActiveTab(HousekeepingTabId.USERS);
                        openPanel();

                        if (parts.length > 4) seedUserFromAvatar(userId, decodeSegment(parts[3]), decodeSegment(parts[4]));

                        lookupUserById(userId);
                        return;
                    }
                }
            },
            eventUrlPrefix: 'housekeeping/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [isAllowed, availableTabs, openPanel, closePanel, togglePanel, setActiveTab, lookupUserById, seedUserFromAvatar]);

    // Permission revoked mid-session (or the module switched off): close right away.
    useEffect(() => {
        if (!isAllowed && isVisible) closePanel();
    }, [isAllowed, isVisible, closePanel]);

    // A remembered tab may not exist in this mode or for this rank.
    useEffect(() => {
        if (availableTabs.length && !availableTabs.includes(activeTab)) setActiveTab(availableTabs[0]);
    }, [activeTab, availableTabs, setActiveTab]);

    const tabs: StaffWindowTab<HousekeepingTabId>[] = useMemo(
        () => availableTabs.map((tab) => ({ id: tab, label: LocalizeText(`housekeeping.tab.${tab}`) })),
        [availableTabs]
    );

    if (!isAllowed || !isVisible) return null;

    return (
        <WidgetErrorBoundary name="HousekeepingView">
            <StaffWindow<HousekeepingTabId>
                activeTab={activeTab}
                className={`volt-housekeeping ${activeTab === HousekeepingTabId.ROLES ? 'is-roles' : ''}`}
                tabs={tabs}
                title={LocalizeText('housekeeping.title')}
                uniqueKey="housekeeping"
                windowPosition={DraggableWindowPosition.TOP_CENTER}
                onClose={closePanel}
                onTabChange={setActiveTab}
            >
                <HousekeepingStatusBanner />
                <HousekeepingPasswordReveal />
                <TabContent tab={activeTab} />
            </StaffWindow>
        </WidgetErrorBoundary>
    );
};
