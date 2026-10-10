import { HousekeepingAccessAudit, HousekeepingAccessMembers, HousekeepingAccessOverrides } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { HousekeepingRolesApi } from '../../../../api/housekeeping/HousekeepingRolesApi';
import { Button, StaffEmpty, StaffField, StaffSection } from '../../../../common';
import { HousekeepingRolesState } from '../../../../hooks/housekeeping/useHousekeepingRoles';

const t = (key: string) => LocalizeText(`housekeeping.roles.${key}`);
const expiry = (value: string) => value ? Math.floor(new Date(value).getTime() / 1000) : 0;
const validExpiry = (value: string) => !value || Number.isFinite(expiry(value)) && expiry(value) > Date.now() / 1000 && expiry(value) <= 2147483647;
const date = (value: number) => value ? new Date(value * 1000).toLocaleString() : t('permanent');
const failed = (setStatus: HousekeepingRolesState['setStatus']) => setStatus({ ok: false, message: LocalizeText('housekeeping.action.error') });

const Pager: FC<{ offset: number; total: number; disabled: boolean; onChange: (offset: number) => void }> = ({ offset, total, disabled, onChange }) => <div className="volt-staff-row">
    <Button variant="secondary" disabled={disabled || offset === 0} onClick={() => onChange(Math.max(0, offset - 25))}>{t('previous')}</Button>
    <span>{total ? `${offset + 1}–${Math.min(offset + 25, total)} / ${total}` : '0'}</span>
    <Button variant="secondary" disabled={disabled || offset + 25 >= total} onClick={() => onChange(offset + 25)}>{t('next')}</Button>
</div>;

export const HousekeepingRoleMembersView: FC<{ admin: HousekeepingRolesState; username: string }> = ({ admin, username }) =>
{
    const { snapshot, roleId, busy, run, setStatus } = admin;
    const [name, setName] = useState(username);
    const [expiresAt, setExpiresAt] = useState('');
    const [offset, setOffset] = useState(0);
    const [result, setResult] = useState<{ page: HousekeepingAccessMembers | null; revision: number; query: number } | null>(null);
    const page = result?.revision === snapshot.revision && result.query === offset ? result.page : null;
    const loading = !!roleId && !(result?.revision === snapshot.revision && result.query === offset);
    const role = snapshot.roles.find(entry => entry.id === roleId);
    const editable = role && role.slug !== 'default' && role.weight < snapshot.actorWeight;

    useEffect(() =>
    {
        let active = true;

        if (!roleId) return;
        HousekeepingRolesApi.members(roleId, offset).then(data =>
        {
            if (active) setResult({ page: data, revision: snapshot.revision, query: offset });
        }).catch(() =>
        {
            if (active)
            {
                setResult({ page: null, revision: snapshot.revision, query: offset }); failed(setStatus);
            }
        });

        return () =>
        {
            active = false;
        };
    }, [roleId, offset, snapshot, setStatus]);

    return <>
        <StaffSection title={t('assign')}>
            <StaffField label={t('username')}><input maxLength={32} value={name} onChange={event => setName(event.target.value)} /></StaffField>
            <StaffField label={t('expiry')}><input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></StaffField>
            <Button disabled={busy || !editable || !name.trim() || !validExpiry(expiresAt)} onClick={() => run(() => HousekeepingRolesApi.assign(snapshot.revision, name, roleId, expiry(expiresAt)))}>{t('assign')}</Button>
        </StaffSection>
        <div className="volt-roles-scroll">
            {loading && <StaffEmpty>{t('loading')}</StaffEmpty>}
            {page?.members.map(member => <div key={member.id} className="volt-roles-member"><span><strong>{member.username}</strong><br />{date(member.expiresAt)}</span><Button variant="danger" disabled={busy || !editable} onClick={() => run(() => HousekeepingRolesApi.revoke(snapshot.revision, member.id, roleId))}>{t('revoke')}</Button></div>)}
            {page && page.total === 0 && <StaffEmpty>{t('empty')}</StaffEmpty>}
        </div>
        {page && <Pager offset={page.offset} total={page.total} disabled={busy || loading} onChange={setOffset} />}
    </>;
};

export const HousekeepingRoleOverridesView: FC<{ admin: HousekeepingRolesState; username: string }> = ({ admin, username }) =>
{
    const { snapshot, busy, run, setStatus } = admin;
    const [name, setName] = useState(username);
    const [lookup, setLookup] = useState(username);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ page: HousekeepingAccessOverrides | null; revision: number; lookup: string } | null>(null);
    const page = result?.revision === snapshot.revision && result.lookup === lookup ? result.page : null;
    const loading = !!lookup && !(result?.revision === snapshot.revision && result.lookup === lookup);
    const [key, setKey] = useState('');
    const [deny, setDeny] = useState(false);
    const [reason, setReason] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    useEffect(() =>
    {
        let active = true;

        if (!lookup) return;
        HousekeepingRolesApi.overrides(lookup).then(data =>
        {
            if (active) setResult({ page: data, revision: snapshot.revision, lookup });
        }).catch(() =>
        {
            if (active)
            {
                setResult({ page: null, revision: snapshot.revision, lookup }); failed(setStatus);
            }
        });

        return () =>
        {
            active = false;
        };
    }, [lookup, attempt, snapshot, setStatus]);

    return <>
        <StaffSection title={t('tab.overrides')}>
            <StaffField label={t('username')}><input maxLength={32} value={name} onChange={event => setName(event.target.value)} /></StaffField>
            <Button variant="secondary" disabled={loading || busy || !name.trim()} onClick={() =>
            {
                setLookup(name.trim()); setAttempt(value => value + 1);
            }}>{t('lookup')}</Button>
            {page?.userId === 0 && <span>{LocalizeText('housekeeping.error.user_not_found')}</span>}
            <StaffField label={t('permission')}><select aria-label={t('permission')} value={key} onChange={event => setKey(event.target.value)}><option value="">-</option>{snapshot.permissions.filter(permission => !permission.isOrphan).map(permission => <option key={permission.key} value={permission.key} disabled={!deny && !permission.canGrant}>{permission.key}</option>)}</select></StaffField>
            <StaffField label={t('effect')}><select aria-label={t('effect')} value={deny ? 'deny' : 'grant'} onChange={event => setDeny(event.target.value === 'deny')}><option value="grant">{t('grant')}</option><option value="deny">{t('deny')}</option></select></StaffField>
            <StaffField label={t('reason')}><input maxLength={512} value={reason} onChange={event => setReason(event.target.value)} /></StaffField>
            <StaffField label={t('expiry')}><input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></StaffField>
            <Button disabled={busy || !name.trim() || !key || !reason.trim() || !validExpiry(expiresAt) || !deny && !snapshot.permissions.find(permission => permission.key === key)?.canGrant} onClick={async () =>
            {
                if (await run(() => HousekeepingRolesApi.setOverride(snapshot.revision, name, key, deny, reason, expiry(expiresAt)))) setLookup(name.trim());
            }}>{t('save')}</Button>
        </StaffSection>
        <div className="volt-roles-scroll">
            {page && page.userId > 0 && <strong>{page.username}</strong>}
            {page?.overrides.map(row => <div key={row.key} className="volt-roles-member"><span><strong>{row.key}</strong> · {row.effect}<br />{row.reason}<br />{date(row.expiresAt)}</span><Button variant="secondary" disabled={busy} onClick={() => run(() => HousekeepingRolesApi.removeOverride(snapshot.revision, page.userId, row.key))}>{t('remove')}</Button></div>)}
            {page && page.userId > 0 && page.overrides.length === 0 && <StaffEmpty>{t('empty')}</StaffEmpty>}
        </div>
    </>;
};

export const HousekeepingRolesAuditView: FC<{ admin: HousekeepingRolesState }> = ({ admin }) =>
{
    const { snapshot, setStatus } = admin;
    const [offset, setOffset] = useState(0);
    const [result, setResult] = useState<{ page: HousekeepingAccessAudit | null; revision: number; query: number } | null>(null);
    const page = result?.revision === snapshot.revision && result.query === offset ? result.page : null;
    const loading = !(result?.revision === snapshot.revision && result.query === offset);

    useEffect(() =>
    {
        let active = true;

        HousekeepingRolesApi.audit(offset).then(data =>
        {
            if (active) setResult({ page: data, revision: snapshot.revision, query: offset });
        }).catch(() =>
        {
            if (active)
            {
                setResult({ page: null, revision: snapshot.revision, query: offset }); failed(setStatus);
            }
        });

        return () =>
        {
            active = false;
        };
    }, [offset, snapshot, setStatus]);

    return <>
        <div className="volt-roles-scroll">
            {page?.entries.map(entry => <details key={entry.id} className="volt-roles-audit"><summary><strong>{entry.actorName}</strong> · {entry.action} → {entry.targetName}<br /><span className="volt-staff-muted">#{entry.id} · {date(entry.createdAt)}</span></summary><pre>{entry.payload}</pre></details>)}
            {page?.total === 0 && <StaffEmpty>{t('empty')}</StaffEmpty>}
        </div>
        {page && <Pager offset={page.offset} total={page.total} disabled={loading} onChange={setOffset} />}
    </>;
};
