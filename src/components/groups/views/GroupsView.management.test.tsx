import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as Renderer from '@octane/renderer';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupSettingsParser } from '../../../../../Octane-Renderer/packages/communication/src/messages/parser/group/GroupSettingsParser';
import { GroupBadgePart } from '../../../api/groups/GroupBadgePart';
import { GroupsView } from '../GroupsView';

const state = vi.hoisted(() => ({
    listeners: new Set<any>(), trackers: new Set<any>(), send: vi.fn(), alert: vi.fn(), confirm: vi.fn(),
    customize: {
        badgeBases: [{ id: 1 }, { id: 2 }], badgeSymbols: [{ id: 1 }, { id: 2 }],
        badgePartColors: [{ id: 1, color: '111111' }, { id: 7, color: '777777' }],
        groupColorsA: [{ id: 1, color: '111111' }, { id: 7, color: '777777' }],
        groupColorsB: [{ id: 2, color: '222222' }, { id: 8, color: '888888' }]
    }
}));

vi.mock('@octane/renderer', async () =>
{
    class MessageEvent
    {
        constructor(public callBack: (event: any) => void)
        {}
    }
    const exports: Record<string, any> = { MessageEvent };
    for (const name of ['GroupInformationEvent', 'GroupSettingsEvent', 'HabboGroupDeactivatedMessageEvent', 'GroupPurchasedEvent',
        'GroupMembersEvent', 'GroupMemberUpdateEvent', 'GroupMembersRefreshEvent', 'GroupConfirmMemberRemoveEvent'])
    {
        exports[name] = class extends MessageEvent
        {};
    }
    for (const name of ['GroupInformationComposer', 'GroupSettingsComposer', 'GroupSaveInformationComposer', 'GroupSaveBadgeComposer', 'GroupSaveColorsComposer',
        'GroupSavePreferencesComposer', 'GroupDeleteComposer', 'GroupMembersComposer', 'GroupAdminGiveComposer', 'GroupAdminTakeComposer',
        'GroupMembershipAcceptComposer', 'GroupMembershipDeclineComposer', 'GroupConfirmRemoveMemberComposer', 'GroupRemoveMemberComposer'])
    {
        exports[name] = class
        {
            args: any[];
            constructor(...args: any[])
            {
                this.args = args;
            }
        };
    }
    return {
        ...exports,
        GroupBadgePart: (await import('../../../../../Octane-Renderer/packages/session/src/badge/GroupBadgePart')).GroupBadgePart,
        GroupRank: { OWNER: 0, ADMIN: 1, MEMBER: 2, REQUESTED: 3 },
        GetSessionDataManager: () => ({ userId: 7 }),
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        }),
        AddLinkEventTracker: (tracker: any) => state.trackers.add(tracker),
        RemoveLinkEventTracker: (tracker: any) => state.trackers.delete(tracker),
        CreateLinkEvent: (url: string) =>
        {
            for (const tracker of state.trackers)
            {
                if (url.startsWith(tracker.eventUrlPrefix)) tracker.linkReceived(url);
            }
        }
    };
});

vi.mock('../../../api', async () => ({
    GroupBadgePart: (await import('../../../api/groups/GroupBadgePart')).GroupBadgePart,
    GetGroupMembers: (await import('../../../api/groups/GetGroupMembers')).GetGroupMembers,
    SendMessageComposer: (composer: unknown) => state.send(composer),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    TryVisitRoom: vi.fn(), GetUserProfile: vi.fn()
}));
vi.mock('../../../hooks', async () => ({
    useMessageEvent: (await import('../../../hooks/events/useMessageEvent')).useMessageEvent,
    useNotification: () => ({ showConfirm: state.confirm, simpleAlert: state.alert }),
    useGroup: () => ({ groupCustomize: state.customize })
}));
vi.mock('../../../common', () =>
{
    const Container = ({ children, onClick, className, title }: any) => <div className={className} onClick={onClick} title={title}>{children}</div>;
    return {
        Column: Container, Flex: Container, Grid: Container, AutoGrid: Container, Text: Container,
        OctaneCardView: Container, OctaneCardContentView: Container, OctaneCardTabsView: Container,
        OctaneCardTabsItemView: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        OctaneCardHeaderView: ({ headerText, onCloseClick }: any) => <header>{headerText}<button onClick={onCloseClick}>Close</button></header>,
        Button: ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
        HorizontalRule: () => <hr />,
        LayoutBadgeImageView: ({ badgeCode }: any) => <img alt={badgeCode} />,
        LayoutAvatarImageView: () => <img alt="avatar" />
    };
});
vi.mock('../../../layout', () => ({ OctaneInput: (props: any) => <input {...props} />, classNames: (...args: any[]) => args.filter(Boolean).join(' ') }));
vi.mock('./GroupCreatorView', () => ({ GroupCreatorView: () => null }));
vi.mock('./GroupInformationStandaloneView', () => ({ GroupInformationStandaloneView: () => null }));

function dispatch(type: any, parser: any)
{
    act(() =>
    {
        for (const listener of [...state.listeners])
        {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
}

function openManager(colorA = 1)
{
    act(() => Renderer.CreateLinkEvent('groups/manage/99'));
    expect(state.send).toHaveBeenCalledWith(new Renderer.GroupSettingsComposer(99));

    // Settings wire order from ManageGroupComposer, decoded by the real SDK parser.
    const groupSettingsWireFields: (number | string | boolean)[] = [1, 42, 'Home room', false, true, 99, 'Test group', 'Description', 42,
        colorA, 2, 0, 0, false, '', 5, 1, 1, 4, 1, 1, 0, 0, 1, 4, 0, 1, 4, 0, 1, 4, 'b01014s01010', 2, false];
    const parser = new GroupSettingsParser();
    parser.flush();
    const read = () =>
    {
        if (!groupSettingsWireFields.length) throw new Error('Truncated settings packet');
        return groupSettingsWireFields.shift();
    };
    expect(parser.parse({ readInt: read, readString: read, readBoolean: read } as any)).toBe(true);
    expect(groupSettingsWireFields).toHaveLength(0);
    expect(parser.roomId).toBe(42);
    dispatch(Renderer.GroupSettingsEvent, parser);
}

function clickTab(tab: number)
{
    fireEvent.click(screen.getByRole('button', { name: `group.edit.tab.${tab}` }));
}

function sent(type: any)
{
    return state.send.mock.calls.map(([composer]) => composer).filter(composer => composer instanceof type).map(composer => composer.args);
}

describe('group management flow', () =>
{
    beforeEach(() =>
    {
        state.send.mockClear(); state.alert.mockClear(); state.confirm.mockClear();
    });
    afterEach(() =>
    {
        cleanup(); state.listeners.clear(); state.trackers.clear();
    });

    it('opens from the manage link, saves identity on tab switch, blocks invalid names, and resets on reopen', () =>
    {
        render(<GroupsView />);
        openManager();
        expect(screen.getByDisplayValue('Test group')).toBeVisible();
        fireEvent.change(screen.getByDisplayValue('Test group'), { target: { value: 'Renamed' } });
        clickTab(2);
        expect(sent(Renderer.GroupSaveInformationComposer)).toEqual([[99, 'Renamed', 'Description']]);
        clickTab(1);
        expect(screen.getByDisplayValue('Renamed')).toBeVisible();
        fireEvent.change(screen.getByDisplayValue('Renamed'), { target: { value: 'x'.repeat(31) } });
        clickTab(5);
        expect(state.alert).toHaveBeenCalled();
        expect(screen.getAllByRole('textbox')[0]).toHaveValue('x'.repeat(31));
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.getAllByRole('textbox')[0]).toHaveValue('x'.repeat(31));
        openManager();
        expect(screen.getByDisplayValue('Test group')).toBeVisible();
    });

    it('shows the reference color-selection error and keeps the colors tab open until a valid color is selected', () =>
    {
        render(<GroupsView />); openManager(999); clickTab(3); clickTab(5);
        expect(state.alert).toHaveBeenCalledWith('group.edit.error.no.color.selected', null, null, null, 'group.edit.error.title');
        expect(screen.getByText('group.edit.color.primary.color')).toBeVisible();
        expect(sent(Renderer.GroupSaveColorsComposer)).toEqual([]);
    });

    it('saves badge edits without mutating the original, supports real color IDs and preserves position zero', () =>
    {
        const { container } = render(<StrictMode><GroupsView /></StrictMode>);
        openManager(); clickTab(2);
        const selectColor = () => fireEvent.click(container.querySelector('[style="background-color: rgb(119, 119, 119);"]'));
        selectColor();
        fireEvent.click(screen.getByRole('button', { name: 'group.edit.reset.badge' }));
        clickTab(3);
        expect(sent(Renderer.GroupSaveBadgeComposer)).toEqual([]);
        clickTab(2); selectColor(); clickTab(3);
        expect(sent(Renderer.GroupSaveBadgeComposer)).toEqual([[99, [1, 7, 4, 1, 1, 0]]]);
        clickTab(2); clickTab(3);
        expect(sent(Renderer.GroupSaveBadgeComposer)).toHaveLength(1);
        expect(new GroupBadgePart('s', 1, 1, 0).code).toBe('s01010');
    });

    it('resets colors, saves preferences including forum on close, and does not repeat unchanged saves', () =>
    {
        const { container } = render(<GroupsView />);
        openManager(); clickTab(3);
        const selectColor = () => fireEvent.click(container.querySelector('[style="background-color: rgb(119, 119, 119);"]'));
        selectColor(); fireEvent.click(screen.getByRole('button', { name: 'group.edit.reset.color' })); clickTab(5);
        expect(sent(Renderer.GroupSaveColorsComposer)).toEqual([]);
        clickTab(3); selectColor(); clickTab(5);
        expect(sent(Renderer.GroupSaveColorsComposer)).toEqual([[99, 7, 2]]);
        fireEvent.click(screen.getAllByRole('radio')[1]);
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        dispatch(Renderer.GroupInformationEvent, { id: 99, title: 'Test group', description: 'Description',
            type: 0, canMembersDecorate: true, hasForum: false, membersCount: 2 });
        expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(sent(Renderer.GroupSavePreferencesComposer)).toEqual([[99, 1, 1, true]]);
        expect(screen.queryByText('group.window.title')).toBeNull();
    });

    it('opens members, performs admin and request actions, confirms removal, and closes after deletion', () =>
    {
        render(<GroupsView />); openManager();
        fireEvent.click(screen.getByRole('button', { name: 'group.membercount' }));
        expect(sent(Renderer.GroupMembersComposer)).toContainEqual([99, 0, '', 0]);
        const member = { id: 8, rank: Renderer.GroupRank.MEMBER, name: 'Member', figure: '', joinedAt: 'today' };
        const payload = { groupId: 99, query: '', pageIndex: 0, level: 0, totalMembersCount: 3, pageSize: 14, admin: true,
            groupTitle: 'Test group', badge: 'b01014', result: [member, { ...member, id: 9, rank: Renderer.GroupRank.ADMIN }] };
        dispatch(Renderer.GroupMembersEvent, payload);
        dispatch(Renderer.GroupInformationEvent, { id: 99, isOwner: true, title: 'Test group', description: 'Description',
            type: 0, canMembersDecorate: true, hasForum: false, membersCount: 3 });
        fireEvent.click(screen.getByTitle('group.members.giverights'));
        fireEvent.click(screen.getByTitle('group.members.removerights'));
        expect(sent(Renderer.GroupAdminGiveComposer)).toEqual([[99, 8]]);
        expect(sent(Renderer.GroupAdminTakeComposer)).toEqual([[99, 9]]);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
        expect(sent(Renderer.GroupMembersComposer)).toContainEqual([99, 0, '', 2]);
        dispatch(Renderer.GroupMembersEvent, { ...payload, level: 2, result: [
            { ...member, id: 10, name: 'Applicant', rank: Renderer.GroupRank.REQUESTED },
            { ...member, id: 11, name: 'Declined', rank: Renderer.GroupRank.REQUESTED }
        ] });
        fireEvent.click(screen.getAllByTitle('group.members.accept')[0]);
        fireEvent.click(screen.getAllByTitle('group.members.reject')[1]);
        expect(sent(Renderer.GroupMembershipAcceptComposer)).toEqual([[99, 10]]);
        expect(sent(Renderer.GroupMembershipDeclineComposer)).toEqual([[99, 11]]);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
        dispatch(Renderer.GroupMembersEvent, payload);
        fireEvent.click(screen.getAllByTitle('group.members.kick')[0]);
        expect(sent(Renderer.GroupConfirmRemoveMemberComposer)).toEqual([[99, 8]]);
        dispatch(Renderer.GroupConfirmMemberRemoveEvent, { userId: 123, furnitureCount: 0 });
        expect(state.confirm).not.toHaveBeenCalled();
        dispatch(Renderer.GroupConfirmMemberRemoveEvent, { userId: 8, furnitureCount: 2 });
        act(() => state.confirm.mock.calls[0][1]());
        expect(sent(Renderer.GroupRemoveMemberComposer)).toEqual([[99, 8]]);
        fireEvent.click(screen.getByRole('button', { name: 'group.delete' }));
        act(() => state.confirm.mock.calls[1][1]());
        expect(sent(Renderer.GroupDeleteComposer)).toEqual([[99]]);
        expect(screen.getByText('group.window.title')).toBeVisible();
        dispatch(Renderer.HabboGroupDeactivatedMessageEvent, { groupId: 99 });
        expect(screen.queryByText('group.members.title')).toBeNull();
        expect(screen.queryByText('group.window.title')).toBeNull();
    });
});
