import {
    HousekeepingAccessAudit, HousekeepingAccessMembers, HousekeepingAccessOverrides, HousekeepingAccessRole, HousekeepingAccessSnapshot,
    HousekeepingActionResultEvent, HousekeepingAssignRoleComposer, HousekeepingDeleteRoleComposer, HousekeepingGetRoleMembersComposer,
    HousekeepingGetRolesAuditComposer, HousekeepingGetRolesComposer, HousekeepingGetUserOverridesComposer, HousekeepingRemoveUserOverrideComposer,
    HousekeepingRevokeRoleComposer, HousekeepingRoleMembersEvent, HousekeepingRolesAuditEvent, HousekeepingRolesEvent, HousekeepingSaveRoleComposer,
    HousekeepingSetRoleLimitComposer, HousekeepingSetRolePermissionComposer, HousekeepingSetUserOverrideComposer, HousekeepingUserOverridesEvent, IMessageComposer
} from '@volt/renderer';
import { awaitMessageEvent } from '../volt/awaitMessageEvent';
import { SendMessageComposer } from '../volt/SendMessageComposer';
import { IHousekeepingActionResult } from './IHousekeepingTypes';

let requestId = 0;
let mutations: Promise<unknown> = Promise.resolve();

const run = (composer: IMessageComposer<unknown[]>, actionKey: string): Promise<IHousekeepingActionResult> =>
{
    const result = mutations.then(async () =>
    {
        const response = awaitMessageEvent<HousekeepingActionResultEvent, IHousekeepingActionResult>(HousekeepingActionResultEvent, {
            accept: event => event.getParser()?.actionKey === actionKey,
            select: event =>
            {
                const parser = event.getParser();

                return { ok: parser.ok, actionId: parser.actionId, message: parser.message };
            }
        });

        SendMessageComposer(composer);

        return response;
    });

    mutations = result.catch(() => null);

    return result;
};

export const HousekeepingRolesApi = {
    snapshot: (): Promise<HousekeepingAccessSnapshot> =>
    {
        const id = ++requestId;
        const response = awaitMessageEvent<HousekeepingRolesEvent, HousekeepingAccessSnapshot>(HousekeepingRolesEvent, {
            accept: event => event.getParser()?.requestId === id,
            select: event => event.getParser().data
        });

        SendMessageComposer(new HousekeepingGetRolesComposer(id));

        return response;
    },
    members: (roleId: number, offset = 0): Promise<HousekeepingAccessMembers> =>
    {
        const id = ++requestId;
        const response = awaitMessageEvent<HousekeepingRoleMembersEvent, HousekeepingAccessMembers>(HousekeepingRoleMembersEvent, {
            accept: event => event.getParser()?.requestId === id,
            select: event => event.getParser().data
        });

        SendMessageComposer(new HousekeepingGetRoleMembersComposer(id, roleId, offset));

        return response;
    },
    overrides: (username: string): Promise<HousekeepingAccessOverrides> =>
    {
        const id = ++requestId;
        const response = awaitMessageEvent<HousekeepingUserOverridesEvent, HousekeepingAccessOverrides>(HousekeepingUserOverridesEvent, {
            accept: event => event.getParser()?.requestId === id,
            select: event => event.getParser().data
        });

        SendMessageComposer(new HousekeepingGetUserOverridesComposer(id, username));

        return response;
    },
    audit: (offset = 0): Promise<HousekeepingAccessAudit> =>
    {
        const id = ++requestId;
        const response = awaitMessageEvent<HousekeepingRolesAuditEvent, HousekeepingAccessAudit>(HousekeepingRolesAuditEvent, {
            accept: event => event.getParser()?.requestId === id,
            select: event => event.getParser().data
        });

        SendMessageComposer(new HousekeepingGetRolesAuditComposer(id, offset));

        return response;
    },
    saveRole: (revision: number, role: HousekeepingAccessRole) => run(new HousekeepingSaveRoleComposer(revision, role.id, role.slug, role.name.trim(), role.description, role.weight, role.securityLevel, role.badgeCode, role.isStaff, role.isHidden), 'role.save'),
    deleteRole: (revision: number, roleId: number) => run(new HousekeepingDeleteRoleComposer(revision, roleId), 'role.delete'),
    permission: (revision: number, roleId: number, key: string, grant: boolean) => run(new HousekeepingSetRolePermissionComposer(revision, roleId, key, grant), 'role.permission'),
    limit: (revision: number, roleId: number, key: string, value: number, remove = false) => run(new HousekeepingSetRoleLimitComposer(revision, roleId, key, value, remove), 'role.limit'),
    assign: (revision: number, username: string, roleId: number, expiresAt: number) => run(new HousekeepingAssignRoleComposer(revision, username.trim(), roleId, expiresAt), 'role.assign'),
    revoke: (revision: number, userId: number, roleId: number) => run(new HousekeepingRevokeRoleComposer(revision, userId, roleId), 'role.revoke'),
    setOverride: (revision: number, username: string, key: string, deny: boolean, reason: string, expiresAt: number) => run(new HousekeepingSetUserOverrideComposer(revision, username.trim(), key, deny, reason.trim(), expiresAt), 'permission.save'),
    removeOverride: (revision: number, userId: number, key: string) => run(new HousekeepingRemoveUserOverrideComposer(revision, userId, key), 'permission.remove')
};
