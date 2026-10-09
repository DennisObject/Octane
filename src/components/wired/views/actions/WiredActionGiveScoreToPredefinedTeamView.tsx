import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveScoreToPredefinedTeamView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const [quotaEditor, setQuotaEditor] = useState(false);
    const [quota, setQuota] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams(quotaEditor ? [points, operation, selectedTeam, userSource, quota] : [points, operation, selectedTeam]);

    useEffect(() => {
        if (!trigger) return;
        setQuotaEditor(trigger.intData.length === 5);
        setUserSource(trigger.intData.length === 5 ? trigger.intData[3] : 0);
        setQuota(trigger.intData.length === 5 ? trigger.intData[4] : 0);
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

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}
            footer={quotaEditor ? <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} /> : null}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.setpoints2', LocalizeText('wiredfurni.params.setpoints', ['points'], [points.toString()]), ['points'], [points.toString()])}</Text>
                <Slider max={1000} min={1} value={points} onChange={(event) => setPoints(event)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input
                            checked={operation === value}
                            className="form-check-input"
                            name="pointsOperation"
                            type="radio"
                            onChange={() => setOperation(value)}
                        />
                        <Text>{LocalizeText(`wiredfurni.params.points_operation.${value}`)}</Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                {[1, 2, 3, 4].map((value) => {
                    return (
                        <div key={value} className="flex gap-1">
                            <input
                                checked={selectedTeam === value}
                                className="form-check-input"
                                id={`selectedTeam${value}`}
                                name="selectedTeam"
                                type="radio"
                                onChange={(event) => setSelectedTeam(value)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.team.' + value)}</Text>
                        </div>
                    );
                })}
            </div>
            <label className="flex items-center gap-1">
                <input type="checkbox" checked={quotaEditor} onChange={event => setQuotaEditor(event.target.checked)} />
                <Text>{localizeWithFallback('wiredfurni.params.score.selected_users', 'Score for selected users with a per-game limit')}</Text>
            </label>
            {quotaEditor && <label className="flex flex-col gap-1">
                <Text>{localizeWithFallback('wiredfurni.params.score.quota', 'Scores per player per game (0 = unlimited)')}</Text>
                <input className="form-control" type="number" min={0} max={10} step={1} value={quota}
                    onChange={event => setQuota(Math.max(0, Math.min(10, Number.parseInt(event.target.value, 10) || 0)))} />
            </label>}
        </WiredActionBaseView>
    );
};
