import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const TEAM_OPTIONS = [0, 1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(id === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${id}`), newLine: id === 0 }));

export const WiredTriggeScoreAchievedView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([points, teamType]);

    useEffect(() => {
        setPoints(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setTeamType(trigger.intData.length > 1 ? trigger.intData[1] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup columns={2} name="scoreAchievedTeamType" options={TEAM_OPTIONS} value={teamType} onChange={setTeamType} />
            </WiredSection>
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setscore2" value={points} onChange={setPoints} />
        </WiredTriggerBaseView>
    );
};
