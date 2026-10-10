import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { DANCE_OPTIONS, parseUserActionText, SIGN_OPTIONS, USER_ACTION, USER_ACTION_OPTIONS, userActionText } from '../../../../api';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersByActionView: FC<{}> = () => {
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const { trigger = null, setIntParams = null, setStringParam = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        // own: [action code]; the text is the sign number or "dance N" when the action is filtered.
        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN ? parsed.id : 0);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE ? parsed.id : 1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered, selectedAction === USER_ACTION.SIGN ? signId : danceId));
    }, [danceFilterEnabled, danceId, selectedAction, setIntParams, setStringParam, signFilterEnabled, signId]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
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
                        <label className="flex items-center gap-1">
                            <input checked={signFilterEnabled} className="form-check-input" type="checkbox" onChange={(event) => setSignFilterEnabled(event.target.checked)} />
                            <Text>{LocalizeText('wiredfurni.params.sign_filter')}</Text>
                        </label>
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
                        <label className="flex items-center gap-1">
                            <input checked={danceFilterEnabled} className="form-check-input" type="checkbox" onChange={(event) => setDanceFilterEnabled(event.target.checked)} />
                            <Text>{LocalizeText('wiredfurni.params.dance_filter')}</Text>
                        </label>
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

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={filter} onChange={(event) => setFilter(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(event) => setInverse(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
