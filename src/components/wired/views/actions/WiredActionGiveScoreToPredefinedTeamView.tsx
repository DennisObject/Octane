import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_SLIDER_ECHO, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveScoreToPredefinedTeamView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [quota, setQuota] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const [operation, setOperation] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const { trigger = null, setIntParams = null, setUserSources } = useWired();

    const save = () => {
        setIntParams([operation === 1 ? -points : points, quota, selectedTeam]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        if (trigger.intData.length >= 3) {
            setPoints(Math.abs(trigger.intData[0]));
            setOperation(trigger.intData[0] < 0 ? 1 : 0);
            setQuota(trigger.intData[1]);
            setSelectedTeam(trigger.intData[2]);
        } else {
            setQuota(0);
            setPoints(1);
            setOperation(0);
            setSelectedTeam(1);
        }
        setUserSource(trigger.userSources[0] ?? 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setpoints2" value={points} onChange={setPoints} />
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={10} min={0} titleKey="wiredfurni.params.times_per_game" value={quota} onChange={setQuota} />
            <WiredSection title={localizeWithFallback('wiredfurni.params.points_operation', 'Type of effect:')}>
                <WiredRadioGroup
                    name="pointsOperation"
                    options={[0, 1].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.points_operation.${id}`) }))}
                    value={operation}
                    onChange={setOperation}
                />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup
                    columns={2}
                    name="selectedTeam"
                    options={[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`) }))}
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
