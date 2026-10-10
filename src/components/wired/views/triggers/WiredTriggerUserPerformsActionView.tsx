import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { DANCE_OPTIONS, parseUserActionText, SIGN_OPTIONS, USER_ACTION, USER_ACTION_OPTIONS, userActionText } from '../../../../api';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerUserPerformsActionView: FC<{}> = () => {
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered, selectedAction === USER_ACTION.SIGN ? signId : danceId));
    };

    useEffect(() => {
        if (!trigger) return;

        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN ? parsed.id : 0);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE ? parsed.id : 1);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.action_selection', 'Action')}</Text>
                <select className="form-select form-select-sm" value={selectedAction} onChange={(event) => setSelectedAction(parseInt(event.target.value))}>
                    {USER_ACTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.label, option.fallback)}
                        </option>
                    ))}
                </select>
            </div>
            {selectedAction === USER_ACTION.SIGN && (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <input
                            checked={signFilterEnabled}
                            className="form-check-input"
                            id="signFilterEnabled"
                            type="checkbox"
                            onChange={(event) => setSignFilterEnabled(event.target.checked)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.sign_filter')}</Text>
                    </div>
                    {signFilterEnabled && (
                        <select className="form-select form-select-sm" value={signId} onChange={(event) => setSignId(parseInt(event.target.value))}>
                            {SIGN_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {LocalizeText(option.label)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
            {selectedAction === USER_ACTION.DANCE && (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <input
                            checked={danceFilterEnabled}
                            className="form-check-input"
                            id="danceFilterEnabled"
                            type="checkbox"
                            onChange={(event) => setDanceFilterEnabled(event.target.checked)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.dance_filter')}</Text>
                    </div>
                    {danceFilterEnabled && (
                        <select className="form-select form-select-sm" value={danceId} onChange={(event) => setDanceId(parseInt(event.target.value))}>
                            {DANCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {LocalizeText(option.label)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </WiredTriggerBaseView>
    );
};
