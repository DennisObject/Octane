import { ConditionDefinition, TriggerDefinition, WiredActionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition } from '@octane/renderer';
import { FC, Fragment } from 'react';
import { useWired } from '../../hooks';
import { NativeWiredActionLayoutView, NativeWiredAddonLayoutView, NativeWiredSelectorLayoutView, NativeWiredVariableLayoutView } from './views/WiredNativeLayoutViews';
import { WiredConditionLayoutView } from './views/conditions/WiredConditionLayoutView';
import { WiredTriggerLayoutView } from './views/triggers/WiredTriggerLayoutView';

export const WiredView: FC<{}> = (props) => {
    const { trigger = null } = useWired();

    if (!trigger) return null;

    if (trigger instanceof WiredActionDefinition) {
        return <Fragment key={`wired-action-${trigger.id}-${trigger.code}`}>{NativeWiredActionLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof WiredSelectorDefinition) {
        return <Fragment key={`wired-selector-${trigger.id}-${trigger.code}`}>{NativeWiredSelectorLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof WiredAddonDefinition) {
        return <Fragment key={`wired-addon-${trigger.id}-${trigger.code}`}>{NativeWiredAddonLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof WiredVariableDefinition) {
        return <Fragment key={`wired-variable-${trigger.id}-${trigger.code}`}>{NativeWiredVariableLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof TriggerDefinition) {
        return <Fragment key={`wired-trigger-${trigger.id}-${trigger.code}`}>{WiredTriggerLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof ConditionDefinition) {
        return <Fragment key={`wired-condition-${trigger.id}-${trigger.code}`}>{WiredConditionLayoutView(trigger.code)}</Fragment>;
    }

    return null;
};
