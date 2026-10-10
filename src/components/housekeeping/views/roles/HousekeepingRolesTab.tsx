import { HousekeepingAccessRole } from '@volt/renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { HousekeepingRolesApi } from '../../../../api/housekeeping/HousekeepingRolesApi';
import { Button, StaffField, StaffSection, StaffStatus } from '../../../../common';
import { useHasPermission, useHousekeepingConfirm, useHousekeepingStore } from '../../../../hooks';
import { Permission } from '../../../../api/permissions';
import { useHousekeepingRoles } from '../../../../hooks/housekeeping/useHousekeepingRoles';
import { HousekeepingRoleMembersView, HousekeepingRoleOverridesView, HousekeepingRolesAuditView } from './HousekeepingRolesUserViews';

const t = (key: string) => LocalizeText(`housekeeping.roles.${key}`);
const emptyRole = (): HousekeepingAccessRole => ({ id: 0, slug: '', name: '', description: '', weight: 0, securityLevel: 1, badgeCode: '', isStaff: false, isHidden: false, memberCount: 0, permissions: [], limits: {} });

export const HousekeepingRolesTab: FC = () =>
{
    const allowed = useHasPermission(Permission.HousekeepingRolesManage);
    const { selectedUser } = useHousekeepingStore();
    const admin = useHousekeepingRoles(allowed);
    const { snapshot, roleId, setRoleId, busy, status, run, reload } = admin;
    const [tab, setTab] = useState<'roles' | 'members' | 'overrides' | 'audit'>('roles');
    const [editedRole, setDraft] = useState<HousekeepingAccessRole | null>(null);
    const [search, setSearch] = useState('');
    const confirm = useHousekeepingConfirm();
    const role = snapshot?.roles.find(entry => entry.id === roleId);
    const editable = !!snapshot && (!role || role.weight < snapshot.actorWeight);
    const disabled = busy || !editable;

    const draft = editedRole?.id === roleId ? editedRole : role || emptyRole();

    if (!allowed) return null;

    return <div className="volt-housekeeping-roles">
        <div className="volt-staff-row volt-roles-tabs" role="tablist" aria-label={t('title')}>
            {(['roles', 'members', 'overrides', 'audit'] as const).map(id => <Button key={id} role="tab" aria-selected={tab === id} variant={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>{t(`tab.${id}`)}</Button>)}
            <Button disabled={busy} variant="secondary" onClick={() => reload()}>{t('reload')}</Button>
        </div>
        {status && <StaffStatus tone={status.ok ? 'success' : 'error'} message={status.message} />}
        {!snapshot && <span>{t('loading')}</span>}
        {snapshot && <>
            {(tab === 'roles' || tab === 'members') && <StaffField label={t('role')}>
                <select aria-label={t('role')} value={roleId} disabled={busy} onChange={event =>
                {
                    setRoleId(Number(event.target.value)); setDraft(null);
                }}>
                    <option value={0}>{t('new')}</option>
                    {snapshot.roles.map(entry => <option key={entry.id} value={entry.id}>{entry.name} · {entry.weight} · {entry.memberCount} {t('members')}</option>)}
                </select>
            </StaffField>}
            {tab === 'roles' && <div className="volt-roles-scroll">
                {!editable && <span className="volt-staff-muted">{t('readonly')}</span>}
                <StaffSection title={t('details')}>
                    <div className="volt-staff-grid">
                        <StaffField label={t('slug')}><input maxLength={100} disabled={disabled || draft.id > 0} value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value })} /></StaffField>
                        <StaffField label={t('name')}><input maxLength={100} disabled={disabled} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></StaffField>
                    </div>
                    <StaffField label={t('description')}><input maxLength={255} disabled={disabled} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></StaffField>
                    <div className="volt-staff-grid">
                        <StaffField label={t('weight')}><input type="number" min={0} step={1} disabled={disabled} value={draft.weight} onChange={event => setDraft({ ...draft, weight: Number(event.target.value) })} /></StaffField>
                        <StaffField label={t('security')}><input type="number" min={0} max={7} step={1} disabled={disabled} value={draft.securityLevel} onChange={event => setDraft({ ...draft, securityLevel: Number(event.target.value) })} /></StaffField>
                        <StaffField label={t('badge')}><input maxLength={64} disabled={disabled} value={draft.badgeCode} onChange={event => setDraft({ ...draft, badgeCode: event.target.value })} /></StaffField>
                        <div className="volt-staff-row">
                            <label><input type="checkbox" disabled={disabled} checked={draft.isStaff} onChange={event => setDraft({ ...draft, isStaff: event.target.checked })} /> {t('staff')}</label>
                            <label><input type="checkbox" disabled={disabled} checked={draft.isHidden} onChange={event => setDraft({ ...draft, isHidden: event.target.checked })} /> {t('hidden')}</label>
                        </div>
                    </div>
                    <div className="volt-staff-row">
                        <Button disabled={disabled || !draft.name.trim() || !draft.slug.trim()} onClick={async () =>
                        {
                            if (await run(() => HousekeepingRolesApi.saveRole(snapshot.revision, draft), true)) setDraft(null);
                        }}>{t('save')}</Button>
                        {role && <Button variant="danger" disabled={disabled || role.slug === 'default'} onClick={() => confirm(t('confirm_delete'), async () =>
                        {
                            if (await run(() => HousekeepingRolesApi.deleteRole(snapshot.revision, role.id)))
                            {
                                setRoleId(0); setDraft(null);
                            }
                        })}>{t('delete')}</Button>}
                    </div>
                </StaffSection>
                {role && <>
                    <StaffSection title={t('permissions')}>
                        <input aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)} />
                        {Array.from(new Set(snapshot.permissions.map(permission => permission.category))).map(category =>
                        {
                            const permissions = snapshot.permissions.filter(permission => permission.category === category && `${permission.key} ${permission.description}`.toLowerCase().includes(search.toLowerCase()));

                            return permissions.length > 0 && <fieldset key={category} className="volt-roles-permissions"><legend>{category}</legend>{permissions.map(permission =>
                            {
                                const explicit = role.permissions.includes(permission.key);
                                const inherited = !explicit && role.permissions.some(pattern => pattern === '*' || pattern.endsWith('.*') && permission.key.startsWith(pattern.slice(0, -1)));

                                return <label key={permission.key} title={permission.description} className={permission.isOrphan ? 'is-orphan' : ''}>
                                    <input type="checkbox" checked={explicit} disabled={disabled || !(permission.canGrant || permission.isOrphan && explicit)} onChange={event => run(() => HousekeepingRolesApi.permission(snapshot.revision, role.id, permission.key, event.target.checked))} />
                                    <span>{permission.key}{permission.isOrphan ? ` (${t('orphan')})` : inherited ? ` (${t('wildcard')})` : ''}</span>
                                </label>;
                            })}</fieldset>;
                        })}
                    </StaffSection>
                    <StaffSection title={t('limits')}>
                        {Object.keys(snapshot.limits).map(key => <RoleLimit key={`${role.id}-${key}-${role.limits[key]}`} name={key} value={role.limits[key]} max={snapshot.limits[key]} disabled={disabled} onSave={(value, remove) => run(() => HousekeepingRolesApi.limit(snapshot.revision, role.id, key, value, remove))} />)}
                    </StaffSection>
                </>}
            </div>}
            {tab === 'members' && <HousekeepingRoleMembersView key={roleId} admin={admin} username={selectedUser?.username || ''} />}
            {tab === 'overrides' && <HousekeepingRoleOverridesView admin={admin} username={selectedUser?.username || ''} />}
            {tab === 'audit' && <HousekeepingRolesAuditView admin={admin} />}
        </>}
    </div>;
};

const RoleLimit: FC<{ name: string; value?: number; max: number; disabled: boolean; onSave: (value: number, remove: boolean) => void }> = ({ name, value, max, disabled, onSave }) =>
{
    const [draft, setDraft] = useState(value ?? 0);

    return <div className="volt-roles-limit">
        <span>{name} {value === undefined && `(${t('fallback')})`}</span>
        <input aria-label={name} type="number" min={0} max={max} step={1} disabled={disabled} value={draft} onChange={event => setDraft(Number(event.target.value))} />
        <Button variant="secondary" disabled={disabled || !Number.isInteger(draft) || draft < 0} onClick={() => onSave(draft, false)}>{t('save')}</Button>
        <Button variant="secondary" disabled={disabled || value === undefined} onClick={() => onSave(0, true)}>{t('remove')}</Button>
    </div>;
};
