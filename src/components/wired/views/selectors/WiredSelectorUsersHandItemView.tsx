import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersHandItemView: FC<{}> = () => {
    const [handItemId, setHandItemId] = useState(0);
    const { trigger = null, setIntParams = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([handItemId]);
    }, [handItemId, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <WiredHandItemField handItemId={handItemId} onChange={setHandItemId} showCopyButton={true} />

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filter}
                        onChange={(event) => setFilter(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(event) => setInverse(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
