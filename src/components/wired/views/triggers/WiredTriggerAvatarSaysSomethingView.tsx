import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const MATCH_CONTAINS = 0;
const MATCH_EXACT = 1;
const MATCH_ALL = 2;

interface WiredTriggerAvatarSaysSomethingViewProps {
    /**
     * The say-your-username trigger (code 31) fires on the speaker's own name, so it has no keyword
     * and no match mode; only the hide and owner-only switches are its own.
     */
    usernameOnly?: boolean;
}

export const WiredTriggerAvatarSaysSomethingView: FC<WiredTriggerAvatarSaysSomethingViewProps> = ({ usernameOnly = false }) => {
    const [message, setMessage] = useState('');
    const [matchMode, setMatchMode] = useState(MATCH_CONTAINS);
    const [hideMessage, setHideMessage] = useState(false);
    const [ownerOnly, setOwnerOnly] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () => {
        setStringParam(usernameOnly ? '' : message);
        setIntParams([usernameOnly ? MATCH_CONTAINS : matchMode, hideMessage ? 1 : 0, ownerOnly ? 1 : 0]);
    };

    useEffect(() => {
        setMessage(trigger?.stringData ?? '');
        setMatchMode(trigger?.intData?.length > 0 ? trigger.intData[0] : MATCH_CONTAINS);
        setHideMessage(trigger?.intData?.length > 1 ? trigger.intData[1] === 1 : false);
        setOwnerOnly(trigger?.intData?.length > 2 ? trigger.intData[2] === 1 : false);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            {usernameOnly && (
                <WiredSection>
                    <span className="octane-wired__text octane-wired__text--soft octane-wired__text--wrap">
                        {localizeWithFallback('wiredfurni.params.username_as_trigger.info', 'Fires when a user says their own username.')}
                    </span>
                </WiredSection>
            )}
            {!usernameOnly && (
                <WiredSection title={LocalizeText('wiredfurni.params.whatissaid')}>
                    <WiredTextInput value={message} onChange={setMessage} />
                </WiredSection>
            )}
            {!usernameOnly && (
                <WiredSection title={LocalizeText('wiredfurni.params.choose_type')}>
                    <WiredRadioGroup
                        name="sayMatchMode"
                        options={[
                            { id: MATCH_CONTAINS, label: LocalizeText('wiredfurni.params.chatcontains') },
                            { id: MATCH_EXACT, label: LocalizeText('wiredfurni.params.exactmatch') },
                            { id: MATCH_ALL, label: LocalizeText('wiredfurni.params.allmatch') }
                        ]}
                        value={matchMode}
                        onChange={setMatchMode}
                    />
                </WiredSection>
            )}
            <WiredSection title={LocalizeText('wiredfurni.params.select_options')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={hideMessage} label={LocalizeText('wiredfurni.params.chat.hide')} onChange={setHideMessage} />
                    <WiredCheckboxOption checked={ownerOnly} label={LocalizeText('wiredfurni.params.chat.onlyowner')} last={true} onChange={setOwnerOnly} />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
