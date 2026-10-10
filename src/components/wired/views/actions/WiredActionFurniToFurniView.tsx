import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { nativeSourceOptions } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionFurniToFurniView: FC<{}> = () => {
    const { trigger, setIntParams, setStringParam, setFurniSources, furniIds, secondaryFurniIds, activePickSlot, setActivePickSlot } = useWired();
    const [movers, setMovers] = useState(100);
    const [targets, setTargets] = useState(101);
    useEffect(() => {
        setMovers(trigger?.furniSources[0] ?? 100);
        setTargets(trigger?.furniSources[1] ?? 101);
    }, [trigger]);
    const save = () => {
        setIntParams([]);
        setStringParam('');
        setFurniSources([movers, targets]);
    };
    const limit = trigger?.maximumItemSelectionCount ?? 0;
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            selectionPreview={
                <div className="flex flex-col gap-2">
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.furni.title.mv.0"
                        options={nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni')}
                        value={movers}
                        onChange={setMovers}
                        selectionKind="primary"
                        selectionCount={furniIds.length}
                        selectionLimit={limit}
                        selectionActive={activePickSlot === 0}
                        selectionEnabledValues={[100]}
                        onSelectionActivate={() => setActivePickSlot(0)}
                    />
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.furni.title.mv.1"
                        options={nativeSourceOptions(trigger?.inputSources?.furniAllowed[1], 'furni')}
                        value={targets}
                        onChange={setTargets}
                        selectionKind="secondary"
                        selectionCount={secondaryFurniIds.length}
                        selectionLimit={limit}
                        selectionActive={activePickSlot === 1}
                        selectionEnabledValues={[101]}
                        onSelectionActivate={() => setActivePickSlot(1)}
                    />
                </div>
            }
        />
    );
};
