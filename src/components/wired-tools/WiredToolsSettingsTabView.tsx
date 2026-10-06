import { FC, useMemo } from 'react';
import {
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback,
    normalizeWiredStyle,
    WIRED_STYLE_DEFAULT,
    WIRED_STYLE_OPTIONS,
    wiredStyleTitle
} from '../../api';
import { useNotification, useRoom, useWiredTools } from '../../hooks';
import { WiredMenuButton, WiredMenuCheckbox, WiredMenuItem, WiredMenuPanel, WiredMenuTitle } from './WiredMenuParts';

const WIRED_ACCESS_EVERYONE = 1;
const WIRED_ACCESS_USERS_WITH_RIGHTS = 2;
const WIRED_ACCESS_GROUP_MEMBERS = 4;
const WIRED_ACCESS_GROUP_ADMINS = 8;

interface RoomAccessOption {
    bit: number;
    label: string;
}

export interface WiredToolsSettingsTabViewProps {
    /** Opens the sandbox self-donation tool; the button shows when `wired.selfdonation.enabled` is on. */
    onOpenSelfDonation?: () => void;
}

const toggleMaskBit = (mask: number, bit: number): number => (mask & bit ? mask & ~bit : mask | bit);
const normalizeAccessMask = (mask: number): number => ((mask & WIRED_ACCESS_GROUP_MEMBERS) !== 0 ? mask | WIRED_ACCESS_GROUP_ADMINS : mask);

const buildInspectOptions = (): RoomAccessOption[] => [
    { bit: WIRED_ACCESS_EVERYONE, label: 'Everyone' },
    { bit: WIRED_ACCESS_USERS_WITH_RIGHTS, label: 'Users with rights' },
    { bit: WIRED_ACCESS_GROUP_MEMBERS, label: 'Group members' },
    { bit: WIRED_ACCESS_GROUP_ADMINS, label: 'Group admins' }
];

const buildModifyOptions = (): RoomAccessOption[] => [
    { bit: WIRED_ACCESS_USERS_WITH_RIGHTS, label: 'Users with rights' },
    { bit: WIRED_ACCESS_GROUP_MEMBERS, label: 'Group members' },
    { bit: WIRED_ACCESS_GROUP_ADMINS, label: 'Group admins' }
];

/**
 * The timezones the room can pick: the hotel's own list from `wired.timezones` (comma separated)
 * when it has one, otherwise everything the browser knows, with the room's current zone and the
 * hotel's server zone always present.
 */
export const buildTimezoneOptions = (current: string, hotelZone: string, configured: string): string[] => {
    const zones: string[] = [];
    const add = (zone: string) => {
        const trimmed = (zone || '').trim();

        if (trimmed && !zones.includes(trimmed)) zones.push(trimmed);
    };

    add(current);
    add(hotelZone);

    const fromConfig = (configured || '')
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean);

    if (fromConfig.length) {
        fromConfig.forEach(add);
    } else {
        try {
            const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

            supported.forEach(add);
        } catch {
            // An older browser without the list still offers the zones it was given.
        }
    }

    add('UTC');

    return zones;
};

export const WiredToolsSettingsTabView: FC<WiredToolsSettingsTabViewProps> = ({ onOpenSelfDonation = null }) => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const { accountPreferences, roomSettings, saveRoomSettings, saveRoomTimezone, reloadRoomWired, rollbackRoomWired, updateAccountPreferences } =
        useWiredTools();

    const canManageSettings = roomSettings.canManageSettings;
    const canChangeRoomState = roomSettings.isLoaded && roomSettings.canModify;
    const inspectOptions = buildInspectOptions();
    const modifyOptions = buildModifyOptions();
    const serverTimeZone = roomSession?.hotelTimeZone || 'UTC';
    const selectedTimeZone = roomSettings.timezone || serverTimeZone;
    const timezoneOptions = useMemo(
        () => buildTimezoneOptions(selectedTimeZone, serverTimeZone, GetConfigurationValue<string>('wired.timezones', '')),
        [selectedTimeZone, serverTimeZone]
    );
    const showSelfDonation = !!onOpenSelfDonation && GetConfigurationValue<boolean>('wired.selfdonation.enabled', false);

    const updateInspectMask = (bit: number) => {
        if (!canManageSettings) return;

        saveRoomSettings(normalizeAccessMask(toggleMaskBit(roomSettings.inspectMask, bit)), roomSettings.modifyMask);
    };

    const updateModifyMask = (bit: number) => {
        if (!canManageSettings) return;

        const nextModifyMask = toggleMaskBit(roomSettings.modifyMask, bit);
        const enabledModifyBit = (nextModifyMask & bit) !== 0;
        const normalizedModifyMask = normalizeAccessMask(nextModifyMask);
        const nextInspectMask = normalizeAccessMask(enabledModifyBit ? roomSettings.inspectMask | bit : roomSettings.inspectMask);

        saveRoomSettings(nextInspectMask, normalizedModifyMask);
    };

    const confirmRoomState = (messageKey: string, fallback: string, action: () => void) => {
        if (!canChangeRoomState) return;

        if (!showConfirm) {
            action();
            return;
        }

        showConfirm(
            localizeWithFallback(messageKey, fallback),
            action,
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            LocalizeText('generic.alert.title')
        );
    };

    const renderAccessOption = (option: RoomAccessOption, mask: number, onToggle: (bit: number) => void, y: number) => (
        <WiredMenuCheckbox
            key={option.label}
            checked={(mask & option.bit) !== 0}
            disabled={!roomSettings.isLoaded || !canManageSettings}
            h={19}
            label={option.label}
            w={214}
            x={0}
            y={y}
            onChange={() => onToggle(option.bit)}
        />
    );

    const confirmReload = () =>
        confirmRoomState(
            'wiredmenu.settings.room_state.reload.warning',
            'Reload the wired of this room? Every box is wired up again from the furniture as it stands now.',
            reloadRoomWired
        );
    const confirmRollback = () =>
        confirmRoomState(
            'wiredmenu.settings.room_state.rollback.warning',
            'Roll back the wired of this room? Every box is re-read from storage and edits that were never saved are lost.',
            rollbackRoomWired
        );

    return (
        <>
            <WiredMenuTitle h={19} w={208} x={14} y={18}>
                Room settings:
            </WiredMenuTitle>
            <WiredMenuPanel h={111} w={227} x={14} y={38}>
                <WiredMenuTitle h={20} w={205} x={10} y={8}>
                    Who can modify Wired:
                </WiredMenuTitle>
                <WiredMenuItem x={10} y={28}>
                    {modifyOptions.map((option, index) => renderAccessOption(option, roomSettings.modifyMask, updateModifyMask, index * 19))}
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuPanel h={111} w={227} x={259} y={38}>
                <WiredMenuTitle h={20} w={195} x={10} y={8}>
                    Who can inspect Wired:
                </WiredMenuTitle>
                <WiredMenuItem x={10} y={28}>
                    {inspectOptions.map((option, index) => renderAccessOption(option, roomSettings.inspectMask, updateInspectMask, index * 19))}
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuPanel h={64} w={227} x={14} y={161}>
                <WiredMenuTitle h={20} w={205} x={10} y={8}>
                    Timezone:
                </WiredMenuTitle>
                <WiredMenuItem h={25} w={206} x={10} y={29}>
                    <div className="octane-wired-menu__dropdown-wrap">
<select
                        aria-label="Timezone"
                        className="octane-wired-menu__dropdown"
                        disabled={!roomSettings.isLoaded || !canManageSettings}
                        value={selectedTimeZone}
                        onChange={(event) => saveRoomTimezone(event.target.value)}
                    >
                        {timezoneOptions.map((zone) => (
                            <option key={zone} value={zone}>
                                {zone === serverTimeZone ? `${zone} (hotel)` : zone}
                            </option>
                        ))}
                    </select>
</div>
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuPanel h={64} w={227} x={259} y={161}>
                <WiredMenuTitle h={20} w={205} x={10} y={8}>
                    Room state:
                </WiredMenuTitle>
                <WiredMenuButton disabled={!canChangeRoomState} h={28} w={98} x={10} y={29} onClick={confirmReload}>
                    Reload
                </WiredMenuButton>
                <WiredMenuButton danger={true} disabled={!canChangeRoomState} h={28} w={98} x={119} y={29} onClick={confirmRollback}>
                    Rollback
                </WiredMenuButton>
            </WiredMenuPanel>
            <WiredMenuTitle h={19} w={208} x={14} y={237}>
                Account preferences:
            </WiredMenuTitle>
            <WiredMenuPanel h={111} w={227} x={14} y={257}>
                <WiredMenuTitle h={20} w={205} x={10} y={8}>
                    General:
                </WiredMenuTitle>
                <WiredMenuItem x={10} y={28}>
                    <WiredMenuCheckbox checked={accountPreferences.showToolbarButton} h={19} label="Show wired menu in toolbar" w={214} x={0} y={0} onChange={(showToolbarButton) => updateAccountPreferences({ showToolbarButton })} />
                    <WiredMenuCheckbox checked={accountPreferences.showInspectButton} h={19} label="Furni/user inspect button" w={214} x={0} y={19} onChange={(showInspectButton) => updateAccountPreferences({ showInspectButton })} />
                    <WiredMenuCheckbox checked={accountPreferences.playTestMode} h={19} label="Enable playtesting mode" w={214} x={0} y={38} onChange={(playTestMode) => updateAccountPreferences({ playTestMode })} />
                    <WiredMenuCheckbox checked={accountPreferences.showSystemNotifications} h={19} label="Show all system notifications" w={214} x={0} y={57} onChange={(showSystemNotifications) => updateAccountPreferences({ showSystemNotifications })} />
                </WiredMenuItem>
            </WiredMenuPanel>
            {GetConfigurationValue<boolean>('wired.ui_picker_enabled', false) && (
                <WiredMenuPanel h={64} w={227} x={259} y={257}>
                    <WiredMenuTitle h={20} w={205} x={10} y={8}>
                        {localizeWithFallback('wiredmenu.settings.preferences.wired_style', 'Wired style:')}
                    </WiredMenuTitle>
                    <WiredMenuItem h={25} w={206} x={10} y={29}>
                        <div className="octane-wired-menu__dropdown-wrap">
<select
                            className="octane-wired-menu__dropdown"
                            value={normalizeWiredStyle(accountPreferences.wiredStyle)}
                            onChange={(event) => updateAccountPreferences({ wiredStyle: normalizeWiredStyle(event.target.value) })}
                        >
                            {WIRED_STYLE_OPTIONS.map((style) => (
                                <option key={style} value={style}>
                                    {style === WIRED_STYLE_DEFAULT
                                        ? localizeWithFallback('wiredmenu.settings.preferences.wired_style.default', 'Default (Default)', ['name'], ['Default'])
                                        : wiredStyleTitle(style)}
                                </option>
                            ))}
                        </select>
</div>
                    </WiredMenuItem>
                </WiredMenuPanel>
            )}
            {showSelfDonation && (
                <WiredMenuPanel h={64} w={227} x={259} y={337}>
                    <WiredMenuTitle h={20} w={205} x={10} y={8}>
                        {localizeWithFallback('selfdonation.section', 'Sandbox tools:')}
                    </WiredMenuTitle>
                    <WiredMenuButton h={28} w={206} x={10} y={29} onClick={onOpenSelfDonation}>
                        {localizeWithFallback('selfdonation.title', 'Sandbox donation tool')}
                    </WiredMenuButton>
                </WiredMenuPanel>
            )}
        </>
    );
};
