import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import trashIcon from '../../assets/images/wired/native/menu_trash.png';
import contextIcon from '../../assets/images/wired/native/menu_variable_context.png';
import furniIcon from '../../assets/images/wired/native/menu_variable_furni.png';
import globalIcon from '../../assets/images/wired/native/menu_variable_global.png';
import userIcon from '../../assets/images/wired/native/menu_variable_user.png';
import { VARIABLES_ELEMENTS } from './WiredCreatorTools.constants';
import { VariableDefinition, VariablesElementButton, VariablesElementType, VariableTextValue } from './WiredCreatorTools.types';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const TYPE_ICONS: Partial<Record<VariablesElementType, string>> = { furni: furniIcon, user: userIcon, global: globalIcon, context: contextIcon };

export interface WiredVariablesTabViewProps {
    variablePickerDefinitions: VariableDefinition[];
    selectedVariableDefinition: VariableDefinition | null;
    onPickVariable: (key: string) => void;
    canVariableHighlight: boolean;
    variableManageCanOpen: boolean;
    onOpenManagePanel: () => void;
    arrayInspectorCanOpen: boolean;
    onOpenArrayInspector: () => void;
    canVariableClear: boolean;
    onClearVariable: () => void;
    selectedVariableProperties: { key: string; value: string }[];
    selectedVariableTextValues: VariableTextValue[];
    /** Set together with `onVariablesTypeChange` to drive the type from outside the creator tools store. */
    variablesType?: VariablesElementType;
    onVariablesTypeChange?: (type: VariablesElementType) => void;
    variableElements?: VariablesElementButton[];
    showHighlight?: boolean;
    showArrayInspector?: boolean;
    showTextValues?: boolean;
    clearLabel?: string;
    onOpenWebApiExplorer?: () => void;
    /** Shown in the picker while it has nothing to list. */
    emptyPickerText?: string;
}

export const WiredVariablesTabView: FC<WiredVariablesTabViewProps> = ({
    variablePickerDefinitions,
    selectedVariableDefinition,
    onPickVariable,
    canVariableHighlight,
    variableManageCanOpen,
    onOpenManagePanel,
    arrayInspectorCanOpen,
    onOpenArrayInspector,
    canVariableClear,
    onClearVariable,
    selectedVariableProperties,
    selectedVariableTextValues,
    variablesType: controlledVariablesType,
    onVariablesTypeChange,
    variableElements = VARIABLES_ELEMENTS,
    showHighlight = true,
    showArrayInspector = true,
    showTextValues = true,
    clearLabel,
    onOpenWebApiExplorer,
    emptyPickerText
}) => {
    const storeVariablesType = useWiredCreatorToolsUiStore((s) => s.variablesType);
    const setStoreVariablesType = useWiredCreatorToolsUiStore((s) => s.setVariablesType);
    const isControlled = controlledVariablesType !== undefined && !!onVariablesTypeChange;
    const variablesType = isControlled ? controlledVariablesType : storeVariablesType;
    const setVariablesType = isControlled ? onVariablesTypeChange : setStoreVariablesType;
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);

    return (
        <>
            <WiredMenuTitle h={19} w={165} x={14} y={18}>
                Variable type:
            </WiredMenuTitle>
            <WiredMenuPanel h={47} w={188} x={14} y={38}>
                {variableElements.map((element, index) => (
                    <WiredMenuButton
                        key={element.key}
                        className={variablesType === element.key ? 'is-selected' : ''}
                        disabled={element.disabled}
                        h={36}
                        title={element.label}
                        w={37}
                        x={5 + index * 47}
                        y={5}
                        onClick={() => setVariablesType(element.key)}
                    >
                        <img alt={element.label} className="octane-wired-menu__type-icon" draggable={false} src={TYPE_ICONS[element.key] ?? element.icon} />
                    </WiredMenuButton>
                ))}
            </WiredMenuPanel>
            <WiredMenuTitle h={19} w={165} x={14} y={94}>
                Variable picker:
            </WiredMenuTitle>
            <WiredMenuItem className="octane-wired-menu__box" h={219} w={188} x={14} y={114}>
                <div className="octane-wired-menu__picker-list has-classic-scrollbar">
                    {variablePickerDefinitions.map((variable) => (
                        <button
                            key={variable.key}
                            className={`octane-wired-menu__picker-row ${selectedVariableDefinition?.key === variable.key ? 'is-selected' : ''}`}
                            type="button"
                            onClick={() => onPickVariable(variable.key)}
                        >
                            {variable.key}
                        </button>
                    ))}
                    {!variablePickerDefinitions.length && <div className="octane-wired-menu__empty">{emptyPickerText || 'Nothing to display'}</div>}
                </div>
            </WiredMenuItem>
            {showHighlight && (
                <WiredMenuButton disabled={!canVariableHighlight} h={25} w={73} x={14} y={342} onClick={() => setIsVariableHighlightActive((value) => !value)}>
                    {isVariableHighlightActive ? 'Undo' : 'Highlight'}
                </WiredMenuButton>
            )}
            <WiredMenuButton disabled={!variableManageCanOpen} h={25} w={73} x={95} y={342} onClick={onOpenManagePanel}>
                Manage
            </WiredMenuButton>
            <WiredMenuButton danger={true} disabled={!canVariableClear} h={25} w={25} x={176} y={342} title={clearLabel ?? localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable')} onClick={onClearVariable}>
                <img alt="" className="octane-wired-menu__trash-icon" draggable={false} src={trashIcon} />
            </WiredMenuButton>
            {showArrayInspector && arrayInspectorCanOpen && (
                <WiredMenuButton h={25} w={73} x={14} y={372} onClick={onOpenArrayInspector}>
                    Contents
                </WiredMenuButton>
            )}
            {!!onOpenWebApiExplorer && (
                <WiredMenuButton h={19} w={92} x={110} y={18} onClick={onOpenWebApiExplorer}>
                    {localizeWithFallback('wiredmenu.variables.web_api_explorer', 'Web API explorer')}
                </WiredMenuButton>
            )}
            <WiredMenuTitle h={19} w={188} x={230} y={17}>
                Properties:
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'property', title: 'Property', factor: 0.52, align: 'left' },
                    { key: 'value', title: 'Value', factor: 0.48, align: 'left' }
                ]}
                h={188}
                rows={selectedVariableProperties.map((property) => ({ key: property.key, cells: { property: property.key, value: property.value } }))}
                w={256}
                x={230}
                y={37}
            />
            {showTextValues && (
                <>
                    <WiredMenuTitle h={19} w={188} x={230} y={233}>
                        Text values:
                    </WiredMenuTitle>
                    <WiredMenuTable
                        columns={[
                            { key: 'value', title: 'Value', factor: 0.2, align: 'left' },
                            { key: 'text', title: 'Text', factor: 0.8, align: 'right' }
                        ]}
                        h={115}
                        rows={selectedVariableTextValues.map((entry, index) => ({ key: `${entry.value}-${index}`, cells: { value: entry.value, text: entry.text } }))}
                        w={256}
                        x={230}
                        y={253}
                    />
                </>
            )}
        </>
    );
};
