import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeNativeSource } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const CARRY_MODE_DIRECT = 0;
const CARRY_MODE_SAME_TILE = 1;

const normalizeCarryMode = (value: number) => (value === CARRY_MODE_SAME_TILE ? CARRY_MODE_SAME_TILE : CARRY_MODE_DIRECT);

export const WiredExtraMoveCarryUsersView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setUserSources = null } = useWired();
    const [carryMode, setCarryMode] = useState(CARRY_MODE_DIRECT);
    const [userSource, setUserSource] = useState(0);
    // The card's own user group and default decide which sources are valid; nothing is hardcoded here.
    const userAllowed = trigger?.inputSources?.usersAllowed[0];
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    const normalizeUserSource = (value: number) => normalizeNativeSource(value, userAllowed, userDefault);

    useEffect(() => {
        if (!trigger) return;

        setCarryMode(normalizeCarryMode(trigger.intData.length > 0 ? trigger.intData[0] : CARRY_MODE_DIRECT));
        setUserSource(normalizeUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : userDefault));
    }, [trigger, userDefault, userAllowed]);

    const save = () => {
        setIntParams([normalizeCarryMode(carryMode)]);
        setUserSources([normalizeUserSource(userSource)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            cardStyle={{ width: 420 }}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={userSource}
                    usersTitle="wiredfurni.params.sources.users.title.carry"
                    allowClickedUserSource={false}
                    onChangeUsers={(value) => setUserSource(normalizeUserSource(value))}
                />
            }
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.carry_mode')}</Text>
                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        checked={carryMode === CARRY_MODE_DIRECT}
                        className="form-check-input"
                        name="wiredCarryMode"
                        type="radio"
                        onChange={() => setCarryMode(CARRY_MODE_DIRECT)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.carry_mode.0')}</Text>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        checked={carryMode === CARRY_MODE_SAME_TILE}
                        className="form-check-input"
                        name="wiredCarryMode"
                        type="radio"
                        onChange={() => setCarryMode(CARRY_MODE_SAME_TILE)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.carry_mode.1')}</Text>
                </label>
            </div>
        </WiredExtraBaseView>
    );
};
