import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeScoreAchievedView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([points, teamType]);
    // Localised per render: the texts are not loaded yet when this module is imported.
    const teamOptions = [
        { id: 0, label: localizeWithFallback('wiredfurni.params.team.any', 'Any team'), newLine: true },
        ...[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`) }))
    ];

    useEffect(() => {
        setPoints(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setTeamType(trigger.intData.length > 1 ? trigger.intData[1] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup columns={2} name="scoreAchievedTeamType" options={teamOptions} value={teamType} onChange={setTeamType} />
            </WiredSection>
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setscore2" value={points} onChange={setPoints} />
        </WiredTriggerBaseView>
    );
};
