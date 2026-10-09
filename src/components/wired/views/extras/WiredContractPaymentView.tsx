import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { CONTRACT_DIR_PAY, ContractTermRow, emptyRow, parseContractRules, serializeContractRules } from './contractTermWire';
import { WiredContractRulesEditor } from './WiredContractRulesEditor';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { readContractSettings, WiredContractSettingsView } from './WiredContractSettingsView';

/** Payment: the player gives something and gets nothing back through the contract itself. */
export const WiredContractPaymentView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [giveRules, setGiveRules] = useState<ContractTermRow[][]>([[emptyRow(CONTRACT_DIR_PAY)]]);

    const [settings, setSettings] = useState(readContractSettings());

    useEffect(() => {
        if (!trigger) return;

        const metadata = readContractSettings(trigger.stringData ?? '');
        setSettings(metadata);
        const parsed = parseContractRules(trigger.intData ?? [], metadata.Posters);
        setGiveRules(parsed.giveRules.length ? parsed.giveRules : [[emptyRow(CONTRACT_DIR_PAY)]]);
    }, [trigger]);

    const save = () => {
        const payload = serializeContractRules({ giveRules: settings.PaymentMode === 0 ? [] : giveRules, getRule: [] });
        setIntParams(payload.intParams);
        setStringParam('@contract:' + JSON.stringify({ ...settings, Posters: payload.stringParam }));
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <WiredContractSettingsView kind="payment" value={settings} onChange={setSettings} />
                <Text bold>The user must PAY:</Text>
                {settings.PaymentMode === 1 && <WiredContractRulesEditor direction={CONTRACT_DIR_PAY} rules={giveRules} onChange={setGiveRules} />}
                <Text small>Each option is an alternative — the player pays whichever one they can.</Text>
                <Text small>The Initiate Transaction effect chooses the chests that receive the payment.</Text>
            </div>
        </WiredExtraBaseView>
    );
};
