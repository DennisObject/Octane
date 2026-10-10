import { FC, useCallback } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersSignalView: FC<{}> = () => {
    const { setIntParams = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    // Filter and inverse are category fields of the selector save; the owned ints stay empty.
    const save = useCallback(() => {
        setIntParams([]);
    }, [setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={filter} onChange={(event) => setFilter(event.target.checked)} />
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
