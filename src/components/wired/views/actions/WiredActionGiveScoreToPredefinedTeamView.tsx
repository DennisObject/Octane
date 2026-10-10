import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveScoreToPredefinedTeamView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([points, operation, selectedTeam]);

    useEffect(() => {
        if (trigger.intData.length >= 3) {
            setPoints(trigger.intData[0]);
            setOperation(trigger.intData[1]);
            setSelectedTeam(trigger.intData[2]);
        } else {
            setPoints(1);
            setOperation(0);
            setSelectedTeam(1);
        }
    }, [trigger]);

    // class_3987 = GiveScore's points slider and effect type, plus the team in two columns. The times-per-game
    // slider is hidden like GiveScore.onEditStart does for a 0 count; this server keeps no such count.
    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setpoints2" value={points} onChange={setPoints} />
            {/* GiveScore's "times per game" slider stays in the list while hidden, so its section spacing remains. */}
            <div aria-hidden="true" />
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
