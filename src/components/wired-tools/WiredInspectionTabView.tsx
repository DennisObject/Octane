import { KeyboardEvent } from 'react';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import contextIcon from '../../assets/images/wired/native/menu_variable_context.png';
import furniIcon from '../../assets/images/wired/native/menu_variable_furni.png';
import globalIcon from '../../assets/images/wired/native/menu_variable_global.png';
import userIcon from '../../assets/images/wired/native/menu_variable_user.png';
import { LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView } from '../../common';
import { INSPECTION_ELEMENTS } from './WiredCreatorTools.constants';
import { InspectionFurniSelection, InspectionUserSelection, InspectionVariable } from './WiredCreatorTools.types';
import { WiredMenuButton, WiredMenuCheckbox, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const TYPE_ICONS: Record<string, string> = { furni: furniIcon, user: userIcon, global: globalIcon, context: contextIcon };

/**
 * Structural shape we need from the renderer's variable-definition
 * objects (`IWiredUserVariableDefinition` / `IWiredFurniVariableDefinition`).
 * Declared locally to avoid pulling the renderer SDK into the view.
 */
export interface InspectionGiveDefinition {
    itemId: number;
    name: string;
    hasValue: boolean;
}

export interface WiredInspectionTabViewProps {
    // preview
    selectedFurni: InspectionFurniSelection | null;
    selectedUser: InspectionUserSelection | null;
    roomId: number | null;
    previewPlaceholder: string;

    // keep-selected toggle
    keepSelected: boolean;
    onKeepSelectedChange: (next: boolean) => void;

    // variables table
    displayedVariables: InspectionVariable[];
    selectedInspectionVariableKey: string;
    onSelectInspectionVariable: (variable: InspectionVariable) => void;

    // inline editor — `editingVariable` / `editingValue` come from the
    // store; this tab only needs the cancel / keydown / begin handlers
    // since each tab consumer wraps `onBeginVariableEdit` with its own
    // bookkeeping (variable-key tracking).
    onCancelVariableEdit: () => void;
    onVariableInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onBeginVariableEdit: (variable: InspectionVariable) => void;

    // give-variable popover
    selectedInspectionGiveDefinition: InspectionGiveDefinition | null;
    onSelectGiveVariable: (itemId: number) => void;
    availableInspectionDefinitions: InspectionGiveDefinition[];
    inspectionGiveValue: string;
    onInspectionGiveValueChange: (value: string) => void;
    canGiveInspectionVariable: boolean;
    onGiveInspectionVariable: () => void;

    // remove variable
    canRemoveInspectionVariable: boolean;
    onRemoveInspectionVariable: () => void;
}

/**
 * The "Inspection" tab body of WiredCreatorToolsView, extracted from
 * the parent's inline JSX. Same shape as WiredVariablesTabView:
 * pure presentation, all state and actions arrive as typed props.
 */
export const WiredInspectionTabView = (props: WiredInspectionTabViewProps) => {
    const {
        selectedFurni,
        selectedUser,
        roomId,
        previewPlaceholder,
        keepSelected,
        onKeepSelectedChange,
        displayedVariables,
        selectedInspectionVariableKey,
        onSelectInspectionVariable,
        onCancelVariableEdit,
        onVariableInputKeyDown,
        onBeginVariableEdit,
        selectedInspectionGiveDefinition,
        onSelectGiveVariable,
        availableInspectionDefinitions,
        inspectionGiveValue,
        onInspectionGiveValueChange,
        canGiveInspectionVariable,
        onGiveInspectionVariable,
        canRemoveInspectionVariable,
        onRemoveInspectionVariable
    } = props;

    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);

    return (
        <>
            <WiredMenuTitle h={19} w={165} x={14} y={18}>
                Element type:
            </WiredMenuTitle>
            <WiredMenuPanel h={47} w={141} x={14} y={38}>
                {INSPECTION_ELEMENTS.map((element, index) => (
                    <WiredMenuButton
                        key={element.key}
                        className={inspectionType === element.key ? 'is-selected' : ''}
                        h={36}
                        title={element.label}
                        w={37}
                        x={5 + index * 47}
                        y={5}
                        onClick={() => setInspectionType(element.key)}
                    >
                        <img alt={element.label} className="octane-wired-menu__type-icon" draggable={false} src={TYPE_ICONS[element.key] ?? element.icon} />
                    </WiredMenuButton>
                ))}
            </WiredMenuPanel>
            <WiredMenuTitle h={19} w={165} x={14} y={94}>
                Preview:
            </WiredMenuTitle>
            <WiredMenuPanel className="octane-wired-menu__preview" h={225} w={141} x={14} y={114}>
                {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                    <div className="octane-wired-menu__preview-image">
                        <LayoutRoomObjectImageView category={selectedFurni.category} objectId={selectedFurni.objectId} roomId={roomId} />
                    </div>
                )}
                {inspectionType === 'user' && selectedUser && (
                    <div className="octane-wired-menu__preview-image">
                        {selectedUser.kind === 'pet' ? (
                            <LayoutPetImageView direction={2} figure={selectedUser.figure} posture={selectedUser.posture} />
                        ) : (
                            <LayoutAvatarImageView direction={2} figure={selectedUser.figure} />
                        )}
                    </div>
                )}
                {inspectionType === 'global' && (
                    <div className="octane-wired-menu__preview-image">
                        <img alt="" draggable={false} src={wiredGlobalPlaceholderImage} />
                    </div>
                )}
                {((inspectionType === 'furni' && !selectedFurni) || (inspectionType === 'user' && !selectedUser)) && (
                    <div className="octane-wired-menu__text octane-wired-menu__preview-instruction">{previewPlaceholder}</div>
                )}
            </WiredMenuPanel>
            <WiredMenuCheckbox checked={keepSelected} h={18} label="Keep selected" w={197} x={14} y={348} onChange={onKeepSelectedChange} />
            <WiredMenuTitle h={19} w={188} x={183} y={17}>
                Variables:
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'variable', title: 'Variable', factor: 0.65, align: 'left' },
                    { key: 'value', title: 'Value', factor: 0.35, align: 'right' }
                ]}
                h={297}
                rows={displayedVariables.map((variable) => ({
                    key: variable.key,
                    selected: selectedInspectionVariableKey === variable.key,
                    onSelect: () => onSelectInspectionVariable(variable),
                    cells: {
                        variable: variable.key,
                        value:
                            editingVariable === variable.key ? (
                                <input
                                    autoFocus
                                    className="octane-wired-menu__cell-input"
                                    spellCheck={false}
                                    type="text"
                                    value={editingValue}
                                    onBlur={onCancelVariableEdit}
                                    onChange={(event) => setEditingValue(event.target.value)}
                                    onClick={(event) => event.stopPropagation()}
                                    onKeyDownCapture={onVariableInputKeyDown}
                                />
                            ) : variable.editable ? (
                                <button
                                    className={`octane-wired-menu__link ${variable.valueClassName ?? ''}`}
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onBeginVariableEdit(variable);
                                    }}
                                >
                                    {variable.value}
                                </button>
                            ) : (
                                <span className={variable.valueClassName}>{variable.value}</span>
                            )
                    }
                }))}
                w={303}
                x={183}
                y={37}
            />
            <WiredMenuButton disabled={!canRemoveInspectionVariable} h={25} w={145} x={183} y={343} onClick={onRemoveInspectionVariable}>
                Remove variable
            </WiredMenuButton>
            <WiredMenuButton disabled={!canGiveInspectionVariable} h={25} w={145} x={341} y={343} onClick={() => setIsInspectionGiveOpen((value) => !value)}>
                Give variable
            </WiredMenuButton>
            {isInspectionGiveOpen && (
                <WiredMenuItem className="octane-wired-menu__bubble" h={145} w={186} x={299} y={181}>
                    <WiredMenuTitle h={17} w={158} x={6} y={6}>
                        Variable:
                    </WiredMenuTitle>
                    <WiredMenuItem h={22} w={158} x={6} y={26}>
                        <div className="octane-wired-menu__dropdown-wrap">
<select
                            className="octane-wired-menu__dropdown"
                            value={selectedInspectionGiveDefinition?.itemId ?? 0}
                            onChange={(event) => onSelectGiveVariable(Number(event.target.value))}
                        >
                            {!availableInspectionDefinitions.length && <option value={0}>No variables available</option>}
                            {availableInspectionDefinitions.map((definition) => (
                                <option key={definition.itemId} value={definition.itemId}>
                                    {definition.name}
                                </option>
                            ))}
                        </select>
</div>
                    </WiredMenuItem>
                    <WiredMenuTitle h={17} w={158} x={6} y={52}>
                        Value:
                    </WiredMenuTitle>
                    <WiredMenuItem className="octane-wired-menu__value-box" h={22} w={80} x={6} y={72}>
                        <input
                            disabled={!selectedInspectionGiveDefinition?.hasValue}
                            type="number"
                            value={inspectionGiveValue}
                            onChange={(event) => onInspectionGiveValueChange(event.target.value)}
                        />
                    </WiredMenuItem>
                    <WiredMenuButton disabled={!canGiveInspectionVariable} h={25} w={158} x={6} y={100} onClick={onGiveInspectionVariable}>
                        Create
                    </WiredMenuButton>
                </WiredMenuItem>
            )}
        </>
    );
};
