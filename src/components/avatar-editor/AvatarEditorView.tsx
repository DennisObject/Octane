import {
    AddLinkEventTracker,
    AvatarEditorFigureCategory,
    AvatarFigurePartType,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    SetClothingChangeDataMessageComposer,
    UserFigureComposer
} from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import mainGenericSrc from '../../assets/images/avatareditor/air/main-generic.png';
import mainHeadSrc from '../../assets/images/avatareditor/air/main-head.png';
import mainHotLooksSrc from '../../assets/images/avatareditor/air/main-hotlooks.png';
import mainEffectsSrc from '../../assets/images/avatareditor/air/main-effects.png';
import mainLegsSrc from '../../assets/images/avatareditor/air/main-legs.png';
import mainMiscSrc from '../../assets/images/avatareditor/air/main-misc.png';
import mainTorsoSrc from '../../assets/images/avatareditor/air/main-torso.png';
import wardrobeHangerSrc from '../../assets/images/avatareditor/wardrobe-hanger.png';
import mainNftSrc from '../../assets/images/wardrobe/nft.png';
import { VoltCardContentView, VoltCardHeaderView, VoltCardTabsItemView, VoltCardTabsView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorFigurePreviewView } from './AvatarEditorFigurePreviewView';
import { AvatarEditorModelView } from './AvatarEditorModelView';
import { AvatarEditorNftView } from './AvatarEditorNftView';
import { AvatarEditorHotLooksView } from './AvatarEditorHotLooksView';
import { AvatarEditorEffectsView } from './AvatarEditorEffectsView';
import { AvatarEditorWardrobeView } from './AvatarEditorWardrobeView';

const MAIN_TAB_ICONS: Record<string, string> = {
    [AvatarEditorFigureCategory.GENERIC]: mainGenericSrc,
    [AvatarEditorFigureCategory.HEAD]: mainHeadSrc,
    [AvatarEditorFigureCategory.TORSO]: mainTorsoSrc,
    [AvatarEditorFigureCategory.LEGS]: mainLegsSrc,
    [AvatarEditorFigureCategory.HOTLOOKS]: mainHotLooksSrc,
    [AvatarEditorFigureCategory.EFFECTS]: mainEffectsSrc,
    [AvatarEditorFigureCategory.MISC]: mainMiscSrc,
    [AvatarEditorFigureCategory.NFT]: mainNftSrc
};

// AIR removes unavailable tabs without reordering the survivors.
// AvatarEditor layout mainTabs: generic, head, torso, legs, misc (only with clothing.misc.tab.enabled), hotlooks, effects, nfts.
const MAIN_TAB_ORDER: string[] = [
    AvatarEditorFigureCategory.GENERIC,
    AvatarEditorFigureCategory.HEAD,
    AvatarEditorFigureCategory.TORSO,
    AvatarEditorFigureCategory.LEGS,
    AvatarEditorFigureCategory.MISC,
    AvatarEditorFigureCategory.HOTLOOKS,
    AvatarEditorFigureCategory.EFFECTS,
    AvatarEditorFigureCategory.NFT
];

// The v75 AvatarEditor window opens at (100, 30) and is never recentred.
const INITIAL_EDITOR_POSITION = { x: 100, y: 30 };
const SAVE_COOLDOWN_MS = 1500;

export const AvatarEditorView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimer = useRef<number>(null);
    const [editorPosition, setEditorPosition] = useState(INITIAL_EDITOR_POSITION);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    const {
        setIsVisible: setEditorVisibility,
        clothingChangeData = null,
        setClothingChangeData = null,
        avatarModels,
        activeModelKey,
        setActiveModelKey,
        gender,
        saveEditorEffect,
        getFigureString = null
    } = useAvatarEditor();

    const isHotLooksOpen = activeModelKey === AvatarEditorFigureCategory.HOTLOOKS;
    const isEffectsOpen = activeModelKey === AvatarEditorFigureCategory.EFFECTS;
    const isNftOpen = activeModelKey === AvatarEditorFigureCategory.NFT;
    const hasWardrobe = !clothingChangeData;
    const canUseWardrobe = hasWardrobe && !isNftOpen;
    const orderedModelKeys = Object.keys(avatarModels)
        .filter((modelKey) => modelKey !== AvatarEditorFigureCategory.WARDROBE)
        .sort((left, right) => {
            const leftIndex = MAIN_TAB_ORDER.indexOf(left);
            const rightIndex = MAIN_TAB_ORDER.indexOf(right);

            if (leftIndex === -1) return rightIndex === -1 ? left.localeCompare(right) : 1;
            if (rightIndex === -1) return -1;

            return leftIndex - rightIndex;
        });

    const saveAvatar = () => {
        if (saveTimer.current !== null) return;

        setIsSaving(true);
        saveTimer.current = window.setTimeout(() => {
            saveTimer.current = null;
            setIsSaving(false);
        }, SAVE_COOLDOWN_MS);
        if (clothingChangeData) {
            SendMessageComposer(new SetClothingChangeDataMessageComposer(clothingChangeData.objectId, gender, getFigureString));
        } else {
            SendMessageComposer(new UserFigureComposer(gender, getFigureString));
            saveEditorEffect();
        }

        setIsVisible(false);
    };

    useEffect(() => () => {
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts[2] && parts[3] && (parts[2] === AvatarFigurePartType.MALE || parts[2] === AvatarFigurePartType.FEMALE)) {
                            setClothingChangeData({ objectId: Number(parts[3]), gender: parts[2] });
                            setIsWardrobeOpen(false);
                        } else {
                            setClothingChangeData(null);
                            setIsWardrobeOpen(true);
                        }
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setClothingChangeData(null);
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setClothingChangeData(null);
                        setIsVisible((prevValue) => {
                            if (!prevValue) setIsWardrobeOpen(true);

                            return !prevValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'avatar-editor/'
        };

        const classicLinkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'avatareditor/',
            linkReceived: (url) => {
                if (url.split('/')[1] !== 'open') return;

                setClothingChangeData(null);
                setIsWardrobeOpen(true);
                setIsVisible((visible) => !visible);
            }
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(classicLinkTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(classicLinkTracker);
        };
    }, [setClothingChangeData]);

    useEffect(() => {
        setEditorVisibility(isVisible);

        if (!isVisible) {
            setClothingChangeData(null);
            setIsWardrobeOpen(false);
        }
    }, [isVisible, setEditorVisibility, setClothingChangeData]);

    useEffect(() => {
        if (!canUseWardrobe) setIsWardrobeOpen(false);
    }, [canUseWardrobe]);

    if (!isVisible) return null;

    return (
        <VoltCardView
            className={`volt-avatar-editor${isWardrobeOpen ? ' is-wardrobe-open' : ''}`}
            frameStyle={3}
            initialPosition={editorPosition}
            isResizable={false}
            onPositionChange={setEditorPosition}
            uniqueKey="avatar-editor"
        >
            <VoltCardHeaderView
                headerText=""
                onCloseClick={(event) => setIsVisible(false)}
            >
                <NativeText className="volt-avatar-editor-title" text={LocalizeText(clothingChangeData ? 'widget.furni.clothingchange.editor.title' : 'avatareditor.title')} textStyle="u_frame_title" background={0x377998} overrides={{ color: 0xffffff }} />
            </VoltCardHeaderView>
            <VoltCardContentView className="volt-avatar-editor-content" gap={0}>
                <div className="volt-avatar-editor-stage">
                    <div className="volt-avatar-editor-nameplate">
                        <div className="volt-avatar-editor-name-text"><NativeText text={GetSessionDataManager().userName} textStyle="u_headline_big" background={0x0e3f52} overrides={{ size: 12, color: 0xffffff }} /></div>
                    </div>
                    <div className="volt-avatar-editor-tab-row">
                        <VoltCardTabsView classNames={['avatar-editor-tabs']}>
                            {orderedModelKeys.map((modelKey) => (
                                <VoltCardTabsItemView
                                    key={modelKey}
                                    classNames={['volt-avatar-editor-main-tab', `is-${modelKey}`]}
                                    isActive={activeModelKey === modelKey}
                                    onClick={() => setActiveModelKey(modelKey)}
                                >
                                    <img className="volt-avatar-editor-main-tab-icon" src={MAIN_TAB_ICONS[modelKey]} alt="" draggable={false} />
                                </VoltCardTabsItemView>
                            ))}
                        </VoltCardTabsView>
                    </div>
                    {hasWardrobe && (
                        <button
                            type="button"
                            disabled={!canUseWardrobe}
                            className={`volt-avatar-editor-wardrobe-toggle${isWardrobeOpen ? ' is-open' : ''}`}
                            aria-pressed={isWardrobeOpen}
                            aria-label={LocalizeText('avatareditor.wardrobe.title')}
                            onClick={() => setIsWardrobeOpen((open) => !open)}
                        >
                            <img alt="" draggable={false} src={wardrobeHangerSrc} />
                        </button>
                    )}
                    <div className="volt-avatar-editor-main">
                        {activeModelKey.length > 0 && !isHotLooksOpen && !isEffectsOpen && !isNftOpen && (
                            <AvatarEditorModelView categories={avatarModels[activeModelKey]} name={activeModelKey} />
                        )}
                        {isHotLooksOpen && <AvatarEditorHotLooksView />}
                        {isEffectsOpen && <AvatarEditorEffectsView />}
                        {isNftOpen && <AvatarEditorNftView categories={avatarModels[activeModelKey]} />}
                        <AvatarEditorFigurePreviewView />
                        <button type="button" className="volt-avatar-editor-save" disabled={isSaving} onClick={saveAvatar}>
                            <NativeText className="volt-avatar-editor-save-label" text={LocalizeText('avatareditor.save')} textStyle="button_shiny_bold" background={0xffffff} />
                            <NativeText className="volt-avatar-editor-save-label-disabled" text={LocalizeText('avatareditor.save')} textStyle="button_shiny_bold" background={0xc3c3c1} />
                        </button>
                    </div>
                </div>
                {isWardrobeOpen && canUseWardrobe && <AvatarEditorWardrobeView />}
            </VoltCardContentView>
        </VoltCardView>
    );
};
