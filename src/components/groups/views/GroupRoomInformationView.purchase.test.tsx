import { act, cleanup, render, screen } from '@testing-library/react';
import { CatalogGroupsComposer, GroupInformationComposer, GroupInformationEvent, GroupPurchasedEvent, GuildMembershipsMessageEvent, MessageEvent } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserGroups } from '../../../hooks/groups/useUserGroups';
import { GroupRoomInformationView } from './GroupRoomInformationView';

const state = vi.hoisted(() => ({
    listeners: new Set<any>(),
    send: vi.fn(),
    roomId: 42
}));

vi.mock('@octane/renderer', () =>
{
    class MessageEvent
    {
        constructor(public callBack: (event: any) => void)
        {}
    }
    class GroupInformationComposer
    {
        constructor(public groupId: number, public newWindow: boolean)
        {}
    }
    return {
        MessageEvent,
        GroupInformationComposer,
        CatalogGroupsComposer: class
        {},
        GroupPurchasedEvent: class extends MessageEvent
        {},
        GroupInformationEvent: class extends MessageEvent
        {},
        GuildMembershipsMessageEvent: class extends MessageEvent
        {},
        DesktopViewEvent: class extends MessageEvent
        {},
        RoomEntryInfoMessageEvent: class extends MessageEvent
        {},
        GetGuestRoomResultEvent: class extends MessageEvent
        {},
        HabboGroupDeactivatedMessageEvent: class extends MessageEvent
        {},
        GroupRemoveMemberComposer: class
        {},
        GetSessionDataManager: () => ({ userName: 'Dennis', userId: 7 }),
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../api', () => ({
    SendMessageComposer: (composer: unknown) => state.send(composer),
    GetRoomSession: () => ({ roomId: state.roomId }),
    GetGroupInformation: vi.fn(),
    GetGroupManager: vi.fn(),
    TryJoinGroup: vi.fn(),
    LocalizeText: (key: string) => key,
    GroupMembershipType: { MEMBER: 1, NOT_MEMBER: 0, REQUEST_PENDING: 2 },
    GroupType: { PRIVATE: 2, REGULAR: 0, EXCLUSIVE: 1 }
}));

vi.mock('../../../hooks', async () => ({
    useMessageEvent: (await import('../../../hooks/events/useMessageEvent')).useMessageEvent,
    useNotification: () => ({ showConfirm: vi.fn() })
}));
vi.mock('../../../hooks/events', async () => ({
    useMessageEvent: (await import('../../../hooks/events/useMessageEvent')).useMessageEvent
}));
vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: () =>
    {},
    useSharedHook: (hook: () => unknown) => hook()
}));
vi.mock('../../../common', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    Flex: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
    Text: ({ children }: any) => <span>{children}</span>,
    LayoutBadgeImageView: ({ badgeCode }: any) => <img alt={badgeCode} />
}));

function MembershipList()
{
    const { data } = useUserGroups();
    return <div>{data.map(group => <span key={group.groupId}>{group.groupName}</span>)}</div>;
}

function dispatch(type: typeof MessageEvent, parser: unknown)
{
    act(() =>
    {
        for (const listener of [...state.listeners])
        {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
}

describe('group purchase sidebar refresh', () =>
{
    beforeEach(() =>
    {
        state.roomId = 42;
        state.send.mockClear();
    });
    afterEach(() =>
    {
        cleanup();
        state.listeners.clear();
    });

    it('shows a newly purchased home-room group and refreshes memberships without re-entering', () =>
    {
        render(<><GroupRoomInformationView /><MembershipList /></>);
        expect(screen.queryByText('Test group')).toBeNull();
        state.send.mockClear();

        dispatch(GroupPurchasedEvent, { roomId: 42, guildId: 99 });
        expect(state.send).toHaveBeenCalledWith(new GroupInformationComposer(99, false));
        expect(state.send).toHaveBeenCalledWith(new CatalogGroupsComposer());

        dispatch(GroupInformationEvent, {
            id: 99, title: 'Test group', badge: 'b01014', ownerName: 'Dennis',
            type: 0, membershipType: 3
        });
        expect(screen.getByText('Test group')).toBeVisible();
        expect(screen.getByRole('button', { name: 'group.manage' })).toBeVisible();
        expect(screen.getByRole('img', { name: 'b01014' })).toBeVisible();

        dispatch(GuildMembershipsMessageEvent, { groups: [{ groupId: 99, groupName: 'Test group' }] });
        expect(screen.getAllByText('Test group')).toHaveLength(2);
    });

    it('does not show a different room’s group in the current room sidebar', () =>
    {
        render(<GroupRoomInformationView />);
        dispatch(GroupPurchasedEvent, { roomId: 43, guildId: 99 });
        dispatch(GroupInformationEvent, { id: 99, title: 'Other room group' });
        expect(state.send).not.toHaveBeenCalled();
        expect(screen.queryByText('Other room group')).toBeNull();
    });
});
