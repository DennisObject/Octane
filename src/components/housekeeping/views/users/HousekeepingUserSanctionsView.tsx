import { FC, useState } from 'react';
import { findTemplateById, HK_MAX_REASON_LENGTH, HK_SANCTION_TEMPLATES, HousekeepingSanctionType, LocalizeText } from '../../../../api';
import { Button, StaffField, StaffSection } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HousekeepingNumberInput } from '../HousekeepingNumberInput';

export interface HousekeepingSanctionDraft {
    templateId: string;
    reason: string;
    banHours: number;
    muteMinutes: number;
    tradeLockHours: number;
}

export const DEFAULT_SANCTION_DRAFT: HousekeepingSanctionDraft = { templateId: '', reason: '', banHours: 18, muteMinutes: 60, tradeLockHours: 168 };

interface HousekeepingUserSanctionsViewProps {
    draft: HousekeepingSanctionDraft;
    onDraftChange: (draft: HousekeepingSanctionDraft) => void;
}

const applyTemplate = (draft: HousekeepingSanctionDraft, templateId: string): HousekeepingSanctionDraft => {
    const template = findTemplateById(templateId);

    if (!template) return { ...draft, templateId };

    const next = { ...draft, templateId, reason: LocalizeText(`housekeeping.template.${template.id}.reason`) };

    if (template.type === HousekeepingSanctionType.BAN) next.banHours = template.durationValue;
    if (template.type === HousekeepingSanctionType.MUTE) next.muteMinutes = template.durationValue;
    if (template.type === HousekeepingSanctionType.TRADE_LOCK) next.tradeLockHours = template.durationValue;

    return next;
};

/** Reason, durations and the account actions for the selected user. */
export const HousekeepingUserSanctionsView: FC<HousekeepingUserSanctionsViewProps> = ({ draft, onDraftChange }) => {
    const { selectedUser, isActionPending, banUser, unbanUser, kickUser, muteUser, forceDisconnectUser, resetUserPassword, setUserRank, tradeLockUser } =
        useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [rankDraft, setRankDraft] = useState(1);
    const { templateId, reason, banHours, muteMinutes, tradeLockHours } = draft;
    const update = (patch: Partial<HousekeepingSanctionDraft>) => onDraftChange({ ...draft, ...patch });

    const disabled = !selectedUser || isActionPending;
    const reasonText = reason.trim() || LocalizeText('housekeeping.reason.default');
    const target = selectedUser ? [selectedUser.username || `#${selectedUser.id}`] : [''];
    const ask = (key: string, run: () => void, extra: [string[], string[]] = [[], []]) =>
        confirm(LocalizeText(key, ['username', ...extra[0]], [...target, ...extra[1]]), run);

    return (
        <>
            <StaffSection title={LocalizeText('housekeeping.section.sanctions')}>
                <StaffField label={LocalizeText('housekeeping.field.template')}>
                    <select value={templateId} onChange={(event) => onDraftChange(applyTemplate(draft, event.target.value))}>
                        <option value="">-</option>
                        {HK_SANCTION_TEMPLATES.map((template) => (
                            <option key={template.id} value={template.id}>
                                {LocalizeText(`housekeeping.template.${template.id}`)}
                            </option>
                        ))}
                    </select>
                </StaffField>
                <StaffField label={LocalizeText('housekeeping.field.reason')}>
                    <textarea
                        maxLength={HK_MAX_REASON_LENGTH}
                        placeholder={LocalizeText('housekeeping.field.reason.placeholder')}
                        rows={2}
                        value={reason}
                        onChange={(event) => update({ reason: event.target.value })}
                    />
                </StaffField>
                <div className="octane-housekeeping-durations">
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.unit.hours')} value={banHours} onChange={(value) => update({ banHours: value })} />
                    <Button
                        disabled={disabled}
                        variant="danger"
                        onClick={() => ask('housekeeping.confirm.ban', () => banUser(selectedUser.id, reasonText, banHours), [['h'], [String(banHours)]])}
                    >
                        {LocalizeText('housekeeping.action.ban_h', ['h'], [String(banHours)])}
                    </Button>
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.unit.minutes')} value={muteMinutes} onChange={(value) => update({ muteMinutes: value })} />
                    <Button disabled={disabled} variant="secondary" onClick={() => muteUser(selectedUser.id, reasonText, muteMinutes)}>
                        {LocalizeText('housekeeping.action.mute_min', ['m'], [String(muteMinutes)])}
                    </Button>
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.unit.hours')} value={tradeLockHours} onChange={(value) => update({ tradeLockHours: value })} />
                    <Button disabled={disabled} variant="secondary" onClick={() => ask('housekeeping.confirm.trade_lock', () => tradeLockUser(selectedUser.id, tradeLockHours, reasonText), [['h'], [String(tradeLockHours)]])}>
                        {LocalizeText('housekeeping.action.trade_lock_h', ['h'], [String(tradeLockHours)])}
                    </Button>
                </div>
                <div className="octane-staff-grid">
                    <Button disabled={disabled} variant="secondary" onClick={() => kickUser(selectedUser.id, reasonText)}>
                        {LocalizeText('housekeeping.action.kick')}
                    </Button>
                    <Button disabled={disabled || !selectedUser?.isBanned} variant="secondary" onClick={() => unbanUser(selectedUser.id)}>
                        {LocalizeText('housekeeping.action.unban')}
                    </Button>
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('housekeeping.section.account')}>
                <div className="octane-housekeeping-durations">
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.user.rank')} max={12} value={rankDraft} onChange={setRankDraft} />
                    <Button
                        disabled={disabled}
                        variant="secondary"
                        onClick={() => ask('housekeeping.confirm.set_rank', () => setUserRank(selectedUser.id, rankDraft), [['rank'], [String(rankDraft)]])}
                    >
                        {LocalizeText('housekeeping.action.set_rank')}
                    </Button>
                </div>
                <div className="octane-staff-grid">
                    <Button disabled={disabled} variant="danger" onClick={() => ask('housekeeping.confirm.disconnect', () => forceDisconnectUser(selectedUser.id, reasonText))}>
                        {LocalizeText('housekeeping.action.force_disconnect')}
                    </Button>
                    <Button disabled={disabled} variant="danger" onClick={() => ask('housekeeping.confirm.reset_password', () => resetUserPassword(selectedUser.id))}>
                        {LocalizeText('housekeeping.action.reset_password')}
                    </Button>
                </div>
                <span className="octane-staff-muted">{LocalizeText('housekeeping.user.audit_hint')}</span>
            </StaffSection>
        </>
    );
};
