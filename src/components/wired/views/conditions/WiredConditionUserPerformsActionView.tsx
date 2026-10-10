import { ConditionDefinition } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { DANCE_OPTIONS, parseUserActionText, SIGN_OPTIONS, USER_ACTION, USER_ACTION_OPTIONS, userActionText } from '../../../../api';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const USER_ACTION_SOURCES: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

interface WiredConditionUserPerformsActionViewProps {
    negative?: boolean;
}

export const WiredConditionUserPerformsActionView: FC<WiredConditionUserPerformsActionViewProps> = (props) => {
    const { negative = false } = props;
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { trigger = null, quantifier = 0, setQuantifier = null, setIntParams = null, setStringParam = null, setUserSources = null } = useWired();
    const quantifierKeyPrefix = negative ? 'wiredfurni.params.quantifier.users.neg' : 'wiredfurni.params.quantifier.users';

    const save = () => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered, selectedAction === USER_ACTION.SIGN ? signId : danceId));
        setUserSources([userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);
        const nextUserSource = trigger.userSources.length > 0 ? trigger.userSources[0] : 0;

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN ? parsed.id : 0);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE ? parsed.id : 1);
        setUserSource(nextUserSource);
        setShowAdvanced(nextUserSource !== 0 || (trigger instanceof ConditionDefinition && trigger.quantifier !== 0));
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <input
                                                checked={quantifier === value}
                                                className="form-check-input"
                                                id={`userActionQuantifier${value}`}
                                                name="userActionQuantifier"
                                                type="radio"
                                                onChange={() => setQuantifier(value)}
                                            />
                                            <Text>{LocalizeText(`${quantifierKeyPrefix}.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                            <WiredSourcesSelector showUsers={true} userSource={userSource} userSources={USER_ACTION_SOURCES} onChangeUsers={setUserSource} />
                        </>
                    )}
                </div>
            }
        >
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
                            id="conditionSignFilterEnabled"
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
                            id="conditionDanceFilterEnabled"
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
        </WiredConditionBaseView>
    );
};
