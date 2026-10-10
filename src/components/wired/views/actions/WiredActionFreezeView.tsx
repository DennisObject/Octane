import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

// wiredfurni.params.freeze.effect.0-4 point at these effect names; this hotel's texts lack fx_218.
const EFFECT_OPTIONS = [
    { value: 218, label: 'fx_218', fallback: 'Wired Freeze' },
    { value: 12, label: 'fx_12', fallback: 'Frozen' },
    { value: 11, label: 'fx_11', fallback: 'X-Ray' },
    { value: 53, label: 'fx_53', fallback: 'Easter Chick' },
    { value: 163, label: 'fx_163', fallback: 'Sand trap_name' }
];

export const WiredActionFreezeView: FC<{}> = () => {
    const [effectId, setEffectId] = useState(218);
    const [cancelOnTeleport, setCancelOnTeleport] = useState(false);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([effectId, cancelOnTeleport ? 1 : 0, userSource]);

    useEffect(() => {
        setEffectId(trigger?.intData?.length > 0 ? trigger.intData[0] : 218);
        setCancelOnTeleport(trigger?.intData?.length > 1 ? trigger.intData[1] === 1 : false);
        setUserSource(trigger?.intData?.length > 2 ? trigger.intData[2] : 0);
    }, [trigger]);

    // class_4028: the effect dropdown and the teleport checkbox share the "Pick an effect:" section.
    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.freeze.effect_selection', 'Pick an effect:')}>
                <WiredDropdown
                    caption={localizeWithFallback('wiredfurni.params.freeze.effect_selection', 'Pick an effect:')}
                    options={EFFECT_OPTIONS.map((option) => ({ id: option.value, label: localizeWithFallback(option.label, option.fallback) }))}
                    value={effectId}
                    onChange={setEffectId}
                />
                <WiredCheckboxGroup>
                    <WiredCheckboxOption
                        checked={cancelOnTeleport}
                        label={localizeWithFallback('wiredfurni.params.freeze.cancel_on_teleport', 'Unfreeze when teleporting')}
                        last={true}
                        onChange={setCancelOnTeleport}
                    />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredActionBaseView>
    );
};
