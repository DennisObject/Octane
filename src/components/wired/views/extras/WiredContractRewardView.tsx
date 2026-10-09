import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { CONTRACT_DIR_RECEIVE, ContractTermRow, emptyRow, parseContractRules, serializeContractRules } from './contractTermWire';
import { WiredContractRulesEditor } from './WiredContractRulesEditor';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { readContractSettings, WiredContractSettingsView } from './WiredContractSettingsView';

/** Reward: the player is handed something and asked for nothing, so there is nothing to negotiate. */
export const WiredContractRewardView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [getRule, setGetRule] = useState<ContractTermRow[]>([emptyRow(CONTRACT_DIR_RECEIVE)]);

    const [settings, setSettings] = useState(readContractSettings());

    useEffect(() => {
        if (!trigger) return;

        const metadata = readContractSettings(trigger.stringData ?? '');
        setSettings(metadata);
        const parsed = parseContractRules(trigger.intData ?? [], metadata.Posters);
        setGetRule(parsed.getRule.length ? parsed.getRule : [emptyRow(CONTRACT_DIR_RECEIVE)]);
    }, [trigger]);

    const save = () => {
        const payload = serializeContractRules({ giveRules: [[]], getRule });
        setIntParams(payload.intParams);
        setStringParam('@contract:' + JSON.stringify({ ...settings, Posters: payload.stringParam }));
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <WiredContractSettingsView kind="reward" value={settings} onChange={setSettings} />
                <Text bold>The user will RECEIVE:</Text>
                <WiredContractRulesEditor
                    allowAlternatives={false}
                    direction={CONTRACT_DIR_RECEIVE}
                    rules={[getRule]}
                    onChange={(rules) => setGetRule(rules[0] ?? [])}
                />
                <Text small>The Initiate Transaction effect chooses the chests that supply the reward.</Text>
            </div>
        </WiredExtraBaseView>
    );
};
