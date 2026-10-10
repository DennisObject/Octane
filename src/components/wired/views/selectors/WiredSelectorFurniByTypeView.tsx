import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniByTypeView: FC<{}> = () => {
    const [matchState, setMatchState] = useState(false);

    const { trigger = null, setIntParams, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        setMatchState(p.length >= 1 && p[0] === 1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([matchState ? 1 : 0]);
        setFurniSources([100]);
    }, [matchState, setFurniSources, setIntParams]);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={matchState} onChange={(e) => setMatchState(e.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.state_match')}</Text>
                </label>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={filter} onChange={(e) => setFilter(e.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(e) => setInverse(e.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
