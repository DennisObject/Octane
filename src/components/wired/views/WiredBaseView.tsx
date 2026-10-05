import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import {
    isWiredVolterStyle,
    LocalizeText,
    localizeWithFallback,
    resolveWiredStyle,
    WiredFurniType,
    WiredSelectionVisualizer,
    wiredStyleClassName,
    wiredStyleWidth,
    wiredWidthMultiplier
} from '../../../api';
import volterAtlas from '../../../assets/images/wired/volter_shell_atlas.png';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import { OctaneCardContentView, OctaneCardView, Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';
import { WiredShellButton, WiredShellHeaderView } from './WiredShellHeaderView';
import { WiredVolterBorderView, WiredVolterFrameView } from './WiredVolterFrameView';

export interface WiredBaseViewProps {
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves its section out, for views that show it elsewhere. */
    showSelection?: boolean;
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const {
        wiredType = '',
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        children = null,
        hasSpecialInput = false,
        cardStyle = undefined,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        showSelection = true
    } = props;
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [keepOpenOnSave, setKeepOpenOnSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const [pasteInto, setPasteInto] = useState(false);
    const {
        trigger = null,
        setTrigger = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        furniIds = [],
        setAllowsFurni = null,
        saveWired = null,
        saveWiredAndKeepOpen = null,
        clipboardEntry = null,
        copyWiredToClipboard = null,
        pasteWiredFromClipboard = null,
        resetWiredToDefault = null,
        clearWiredPicks = null
    } = useWired();
    const { roomSettings, activeWiredStyle } = useWiredTools();
    const furniData = trigger ? GetSessionDataManager().getFloorItemData(trigger.spriteId) : null;
    const wiredName = furniData?.name || `NAME: ${trigger?.spriteId ?? -1}`;
    const shellStyle = resolveWiredStyle(activeWiredStyle, furniData?.className);
    const isVolter = isWiredVolterStyle(shellStyle);
    const iconOffset = { action: 0, trigger: 16, condition: 32, selector: 48, extra: 64, variable: 80 }[wiredType];
    const [summaryKind = '', summaryName = ''] = (wiredName || '').split(':', 2);

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const onClose = () => {
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const onSave = (keepOpen: boolean = false) => {
        if (!roomSettings.canModify) return;

        if (validate && !validate()) return;

        if (save) save();

        setKeepOpenOnSave(keepOpen);
        setNeedsSave(true);
    };

    useEffect(() => {
        if (!needsSave) return;

        if (keepOpenOnSave && saveWiredAndKeepOpen) saveWiredAndKeepOpen();
        else saveWired();

        setNeedsSave(false);
        setKeepOpenOnSave(false);
    }, [needsSave, keepOpenOnSave, saveWired, saveWiredAndKeepOpen]);

    const canEdit = !!roomSettings.canModify;
    const onCopy = () => {
        if (validate && !validate()) return;

        if (save) save();

        copyWiredToClipboard?.();
    };
    const menuItems: Array<{ id: string; label: string; disabled: boolean; onClick: () => void; checked?: boolean } | null> = [
        { id: 'copy', label: localizeWithFallback('wiredfurni.params.menu.copy', 'Copy'), disabled: !canEdit, onClick: onCopy },
        {
            id: 'paste',
            label: localizeWithFallback('wiredfurni.params.menu.paste', 'Paste'),
            disabled: !canEdit || !clipboardEntry,
            onClick: () => pasteWiredFromClipboard?.(pasteInto)
        },
        {
            id: 'paste-into',
            label: localizeWithFallback('wiredfurni.params.menu.paste_into', 'Paste into (keep picks and delay)'),
            disabled: !canEdit,
            checked: pasteInto,
            onClick: () => setPasteInto((value) => !value)
        },
        null,
        {
            id: 'clear-picks',
            label: localizeWithFallback('wiredfurni.params.menu.clear_picks', 'Clear furni picks'),
            disabled: !canEdit || !furniIds?.length,
            onClick: () => clearWiredPicks?.()
        },
        { id: 'reset', label: localizeWithFallback('wiredfurni.params.menu.reset', 'Reset to default'), disabled: !canEdit, onClick: () => resetWiredToDefault?.() },
        null
    ];
    const shellMenuItems = [
        ...menuItems,
        { id: 'open-menu', label: localizeWithFallback('wiredfurni.params.menu.open_menu', 'Open Menu'), disabled: false, onClick: () => CreateLinkEvent('wiredmenu/open') },
        null,
        { id: 'save', label: localizeWithFallback('wiredfurni.params.menu.save', 'Save'), disabled: !canEdit, onClick: () => onSave(true) },
        { id: 'close', label: localizeWithFallback('wiredfurni.params.menu.close', 'Close'), disabled: false, onClick: onClose }
    ];

    useEffect(() => {
        if (!trigger) return;

        setShowFooter(false);

        WiredSelectionVisualizer.clearAllSelectionShaders();

        if (hasSpecialInput) {
            setIntParams(trigger.intData);
            setStringParam(trigger.stringData);
        }
    }, [trigger, hasSpecialInput, setIntParams, setStringParam]);

    useEffect(() => {
        if (!trigger) return;

        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) return [];

            if (trigger.selectedItems && trigger.selectedItems.length) {
                WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                return trigger.selectedItems;
            }

            return [];
        });
    }, [trigger, requiresFurni, setFurniIds]);

    useEffect(() => {
        return () => clearRoomAreaSelection();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        setAllowsFurni(requiresFurni);
    }, [trigger, requiresFurni, setAllowsFurni]);

    const resolvedCardStyle: CSSProperties = { ...cardStyle };

    const cardWidth = Math.trunc(wiredStyleWidth(shellStyle) * wiredWidthMultiplier(wiredType, trigger?.code));
    resolvedCardStyle.width = cardWidth;
    resolvedCardStyle.minWidth = cardWidth;
    resolvedCardStyle.maxWidth = cardWidth;
    resolvedCardStyle.resize = 'none';

    const bodySections = (
        <>
            {!!children && <div className="octane-wired__divider" />}
            {!!children && <div className="octane-wired__section octane-wired__section--body">{children}</div>}
            {showSelection && requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE && (
                <>
                    <div className="octane-wired__divider" />
                    <div className="octane-wired__section octane-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                </>
            )}
            {footer && (
                <>
                    <div className="octane-wired__divider" />
                    <div className="octane-wired__section octane-wired__section--footer">
                        {footerCollapsible ? (
                            <>
                                <button className="octane-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
                                    {LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                                </button>
                                {showFooter && <div className="octane-wired__advanced-body">{footer}</div>}
                            </>
                        ) : (
                            footer
                        )}
                    </div>
                </>
            )}
        </>
    );

    return (
        <OctaneCardView
            className={`octane-wired octane-wired--official ${wiredStyleClassName(shellStyle)} ${isVolter ? 'octane-wired--volter' : ''} ${isVolter && shellStyle !== 'volter' ? 'octane-wired--volter-colour' : ''}`}
            theme="primary-slim"
            uniqueKey="octane-wired"
            isResizable={false}
            style={resolvedCardStyle}
        >
            {isWiredVolterStyle(shellStyle) && <WiredVolterFrameView shellStyle={shellStyle} />}
            <WiredShellHeaderView
                key={`${shellStyle}-${trigger?.id}`}
                shellStyle={shellStyle}
                title={LocalizeText('wiredfurni.title')}
                onClose={onClose}
                menuItems={shellMenuItems}
            />
            <OctaneCardContentView classNames={['octane-wired__content']} gap={0}>
                <div className="octane-wired__section octane-wired__summary">
                    {shellStyle === 'illumina' && (
                        <div className="octane-wired__banner" aria-hidden="true">
                            <img className="octane-wired__summary-bg octane-wired__summary-bg--left" src={wiredBgLeft} alt="" />
                            <div className="octane-wired__banner-darkening" />
                            <img className="octane-wired__summary-bg octane-wired__summary-bg--right" src={wiredBgRight} alt="" />
                        </div>
                    )}
                    {isVolter && iconOffset !== undefined && (
                        <svg className="octane-wired__type-icon" viewBox={`${iconOffset} 336 13 14`} aria-hidden="true">
                            <image href={volterAtlas} width={490} height={360} />
                        </svg>
                    )}
                    <div className="octane-wired__summary-copy">
                        {shellStyle === 'illumina' ? (
                            <>
                                <span className="octane-wired__summary-kind">{summaryKind.toUpperCase()}</span>
                                <span className="octane-wired__summary-title">{summaryName.replace(/^ +/, '')}</span>
                            </>
                        ) : (
                            <Text bold className="octane-wired__summary-title">
                                {wiredName}
                            </Text>
                        )}
                    </div>
                </div>
                <div className="octane-wired__body">
                    {isWiredVolterStyle(shellStyle) && shellStyle !== 'volter' ? (
                        <WiredVolterBorderView shellStyle={shellStyle}>{bodySections}</WiredVolterBorderView>
                    ) : bodySections}
                    <div className="octane-wired__divider octane-wired__footer-divider" />
                    <div className="flex items-center gap-1 octane-wired__actions">
                        <WiredShellButton shellStyle={shellStyle} disabled={!roomSettings.canModify} onClick={() => onSave(false)}>
                            {LocalizeText('wiredfurni.ready')}
                        </WiredShellButton>
                        <WiredShellButton shellStyle={shellStyle} onClick={onClose}>
                            {LocalizeText('cancel')}
                        </WiredShellButton>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
