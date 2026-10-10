import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const CLICK_TILE_INTERACTION_TYPES = ['room_invisible_click_tile'];
const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

export const WiredTriggerClickTileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources, setAllowedInteractionTypes = null, setAllowedInteractionErrorKey = null } = useWired();
    const [furniSource, setFurniSource] = useState(100);

    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        setFurniSource(trigger?.furniSources[0] ?? 100);
    }, [trigger]);

    useEffect(() => {
        setAllowedInteractionTypes(CLICK_TILE_INTERACTION_TYPES);
        setAllowedInteractionErrorKey('wiredfurni.error.require_click_tiles');

        return () => {
            setAllowedInteractionTypes(null);
            setAllowedInteractionErrorKey(null);
        };
    }, [setAllowedInteractionErrorKey, setAllowedInteractionTypes]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={false}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={FURNI_SOURCE_OPTIONS} onChangeFurni={setFurniSource} />}
        />
    );
};
