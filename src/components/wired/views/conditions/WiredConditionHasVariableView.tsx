import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredNativeVariableScope, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { useVariableScopeEntries } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionHasVariableViewProps {
    negative?: boolean;
}

/** The scopes the has-variable card offers: the furni, the user, or the execution's own context. */
const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'context'];
/** The furni source that reads the selected furni, which the card needs picks for. */
const FURNI_SOURCE_SELECTED = 100;

/**
 * Owned: [target]; furni: [the holder's furni source]; users: [the holder's user source]; variables: [the variable];
 * the quantifier is the condition's own field; the text is empty. The negative card is the same form, inverted by the server.
 */
export const WiredConditionHasVariableView: FC<WiredConditionHasVariableViewProps> = ({ negative = false }) => {
    const {
        trigger = null,
        furniIds = [],
        setFurniIds = null,
        quantifier = 0,
        setQuantifier = null,
        setIntParams = null,
        setStringParam = null,
        setVariableIds = null,
        setFurniSources = null,
        setUserSources = null
    } = useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [furniSource, setFurniSource] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const entries = useVariableScopeEntries(scope, 'condition', variableToken);

    const picksFurni = scope === 'furni' && furniSource === FURNI_SOURCE_SELECTED;
    const requiresFurni = picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    useEffect(() => {
        if (!trigger) return;

        setScope(scopeOfTargetCode(trigger.intData?.[0]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([targetCodeOfScope(scope)]);
        setFurniSources([scope === 'furni' ? furniSource : 0]);
        setUserSources([scope === 'user' ? userSource : 0]);
        setVariableIds([variableSlotOf(variableToken)]);
        setStringParam('');
        if (!picksFurni) setFurniIds([]);
    };

    const validate = () => !!variableToken;

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <VariableQuantifierRadios
                        name={`wiredConditionHasVariableQuantifier-${negative ? 'neg' : 'pos'}`}
                        value={quantifier}
                        onChange={(value) => setQuantifier?.(value)}
                    />
                    {scope === 'furni' && <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={furniSource} onChangeFurni={setFurniSource} />}
                    {scope === 'user' && <WiredSourcesSelector showUsers={true} userSlot={0} userSource={userSource} onChangeUsers={setUserSource} />}
                    {picksFurni && <FurniPickSlotButtons slots={[{ slot: 0, count: furniIds.length }]} />}
                </div>
            }
        >
            <div className="octane-wired__give-var">
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <VariableScopeButtons scopes={SCOPES} value={scope} onChange={handleScopeChange} />
                </div>

                <WiredVariablePicker entries={entries} recentScope="variable-conditions" selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />
            </div>
        </WiredConditionBaseView>
    );
};
