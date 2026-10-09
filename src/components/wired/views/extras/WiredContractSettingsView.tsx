import { FC } from 'react';
import { Text } from '../../../../common';

export interface ContractSettings {
    Posters: string; PaymentMode: number; ReceiveText: string; Layout: string;
    RewardCategory: number; ShowDialog: boolean; RewardText: string;
}
export const readContractSettings = (text = ''): ContractSettings => {
    const defaults: ContractSettings = { Posters: text, PaymentMode: 1, ReceiveText: '', Layout: 'generic', RewardCategory: 11, ShowDialog: false, RewardText: '' };
    if (!text.startsWith('@contract:')) return defaults;
    try { return { ...defaults, ...JSON.parse(text.slice(10)) }; } catch { return { ...defaults, Posters: '' }; }
};
export const WiredContractSettingsView: FC<{ kind: 'payment' | 'reward' | 'trade'; value: ContractSettings; onChange: (value: ContractSettings) => void }> = ({ kind, value, onChange }) => {
    const put = (change: Partial<ContractSettings>) => onChange({ ...value, ...change });
    return <div className="flex flex-col gap-2">
        {kind === 'payment' && <label><Text bold>Payment type</Text><select className="form-select form-select-sm" value={value.PaymentMode} onChange={event => put({ PaymentMode: Number(event.target.value) })}><option value={1}>Required items</option><option value={0}>Accept donations</option></select></label>}
        {kind !== 'reward' && <label><Text bold>Request text</Text><input className="form-control form-control-sm" maxLength={60} value={value.ReceiveText} onChange={event => put({ ReceiveText: event.target.value })} /></label>}
        {kind === 'trade' && <label><Text bold>Layout</Text><select className="form-select form-select-sm" value={value.Layout} onChange={event => put({ Layout: event.target.value })}><option value="generic">Generic</option><option value="games">Games</option></select></label>}
        {kind === 'reward' && <>
            <label><Text bold>Reward text</Text><textarea className="form-control form-control-sm" maxLength={200} value={value.RewardText} onChange={event => put({ RewardText: event.target.value })} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={value.ShowDialog} onChange={event => put({ ShowDialog: event.target.checked })} /><Text>Open reward dialog</Text></label>
            <label><Text bold>Earnings category</Text><select className="form-select form-select-sm" value={value.RewardCategory} onChange={event => put({ RewardCategory: Number(event.target.value) })}><option value={11}>Games</option><option value={13}>Agency</option></select></label>
        </>}
    </div>;
};
