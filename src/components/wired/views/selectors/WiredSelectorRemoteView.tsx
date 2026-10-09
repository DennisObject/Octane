import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorRemoteView: FC<{}> = () => {
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const [combined, setCombined] = useState(false);
    const [selectionType, setSelectionType] = useState(0);
    const [amount, setAmount] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;
        setFilterExisting(params.length > 0 ? params[0] === 1 : false);
        setInvert(params.length > 1 ? params[1] === 1 : false);
        setCombined(params.length >= 4);
        setSelectionType(params.length >= 4 ? params[2] : 0);
        setAmount(params.length >= 4 ? params[3] : 0);
        setFurniSource(params.length === 5 ? params[4] : 100);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams(combined ? [filterExisting ? 1 : 0, invert ? 1 : 0, selectionType, amount, furniSource]
            : [filterExisting ? 1 : 0, invert ? 1 : 0]);
    }, [combined, filterExisting, invert, selectionType, amount, furniSource, setIntParams]);

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            requiresFurni={furniSource === 100 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            hideDelay={true}
            footer={<WiredSourcesSelector showFurni furniSource={furniSource} furniSources={[
                { value: 0, label: 'wiredfurni.params.sources.furni.0' },
                { value: 100, label: 'wiredfurni.params.sources.furni.100' },
                { value: 201, label: 'wiredfurni.params.sources.furni.201' }
            ]} onChangeFurni={value => { setFurniSource(value); setCombined(true); }} />}
            cardStyle={{ width: 400 }}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.remote.selection', 'Referenced selections')}</Text>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={combined} onChange={event => {
                        setCombined(event.target.checked);
                        if (!event.target.checked) { setSelectionType(0); setAmount(0); setFurniSource(100); }
                    }} />
                    <Text small>{localizeWithFallback('wiredfurni.params.remote.combined', 'Use combined stack selections')}</Text>
                </label>
                {!combined && <Text small>{localizeWithFallback('wiredfurni.params.remote.legacy', 'Saved sequential selection mode. Choose combined selections to use union, intersection or a random stack count.')}</Text>}
                <label className="flex flex-col gap-1"><Text small>{localizeWithFallback('wiredfurni.params.remote.combine', 'Combine selections')}</Text>
                    <select className="form-select" value={selectionType} onChange={event => { setSelectionType(+event.target.value); setCombined(true); }}>
                        <option value={0}>{localizeWithFallback('wiredfurni.params.remote.union', 'Union: selected by any reference')}</option>
                        <option value={1}>{localizeWithFallback('wiredfurni.params.remote.intersection', 'Intersection: selected by every reference')}</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1"><Text small>{localizeWithFallback('wiredfurni.params.remote.amount', 'Random number of referenced stacks (0 selects all)')}</Text>
                    <input className="form-control" type="number" min={0} max={2147483647} value={amount}
                        onChange={event => { setAmount(Math.max(0, Math.min(2147483647, Number.parseInt(event.target.value, 10) || 0))); setCombined(true); }} />
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filterExisting}
                        onChange={(event) => setFilterExisting(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
