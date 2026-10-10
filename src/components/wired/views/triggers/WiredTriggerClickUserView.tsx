import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerClickUserView: FC<{}> = () => {
    const [blockMenuOpen, setBlockMenuOpen] = useState(false);
    const [doNotRotate, setDoNotRotate] = useState(false);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([blockMenuOpen ? 1 : 0, doNotRotate ? 1 : 0]);

    useEffect(() => {
        setBlockMenuOpen(trigger?.intData?.length > 0 ? trigger.intData[0] === 1 : false);
        setDoNotRotate(trigger?.intData?.length > 1 ? trigger.intData[1] === 1 : false);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.click_user.settings', 'When a user is clicked:')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption
                        checked={blockMenuOpen}
                        label={localizeWithFallback('wiredfurni.params.click_user.block_menu_open', 'Do not open avatar menu')}
                        onChange={setBlockMenuOpen}
                    />
                    <WiredCheckboxOption
                        checked={doNotRotate}
                        label={localizeWithFallback('wiredfurni.params.click_user.do_not_rotate', 'Do not rotate')}
                        last={true}
                        onChange={setDoNotRotate}
                    />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
