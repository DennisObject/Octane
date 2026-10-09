import { FC, useEffect, useState } from 'react';
import { Text } from '../../../../common';
import { LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveScoreView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const [quotaEditor, setQuotaEditor] = useState(false);
    const [quota, setQuota] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });

    const save = () => setIntParams(quotaEditor ? [points, operation, userSource, quota] : [points, operation, userSource]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setPoints(trigger.intData[0]);
            setOperation(trigger.intData[1]);
        } else {
            setPoints(1);
            setOperation(0);
        }

        setUserSource(trigger.intData.length > 2 ? trigger.intData[2] : 0);
        setQuotaEditor(trigger.intData.length === 4);
        setQuota(trigger.intData.length === 4 ? trigger.intData[3] : 0);
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
            <WiredSection title={localizeWithFallback('wiredfurni.params.points_operation', 'Type of effect:')}>
                <WiredRadioGroup
                    name="pointsOperation"
                    options={[0, 1].map((value) => ({ id: value, label: LocalizeText(`wiredfurni.params.points_operation.${value}`) }))}
                    value={operation}
                    onChange={setOperation}
                />
            </WiredSection>
            <label className="flex items-center gap-1">
                <input type="checkbox" checked={quotaEditor} onChange={event => setQuotaEditor(event.target.checked)} />
                <Text>{localizeWithFallback('wiredfurni.params.score.quota_settings', 'Set a per-player limit for each game')}</Text>
            </label>
            {quotaEditor && <label className="flex flex-col gap-1">
                <Text>{localizeWithFallback('wiredfurni.params.score.quota', 'Scores per player per game (0 = unlimited)')}</Text>
                <input className="form-control" type="number" min={0} max={10} step={1} value={quota}
                    onChange={event => setQuota(Math.max(0, Math.min(10, Number.parseInt(event.target.value, 10) || 0)))} />
            </label>}
        </WiredActionBaseView>
    );
};
