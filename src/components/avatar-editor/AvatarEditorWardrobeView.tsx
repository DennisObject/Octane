import { GetAvatarRenderManager, HabboClubLevelEnum, IAvatarFigureContainer, SaveWardrobeOutfitMessageComposer } from '@volt/renderer';
import { FC, useCallback, useMemo } from 'react';
import { GetClubMemberLevel, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import hcIconSrc from '../../assets/images/avatareditor/air/wardrobe-hc.png';
import emptySlotSrc from '../../assets/images/avatareditor/wardrobe-empty-slot.png';
import { LayoutAvatarImageView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useAvatarEditor } from '../../hooks';

const SLOTS_PER_COL = 7;
const HC_SLOT_LIMIT = 5;
const DEFAULT_SLOT_COUNT = 10;

const isWardrobeSlotEnabled = (slotId: number): boolean => {
    const level = GetClubMemberLevel();

    if (slotId <= HC_SLOT_LIMIT) return level >= HabboClubLevelEnum.CLUB;

    return level >= HabboClubLevelEnum.VIP;
};

export const AvatarEditorWardrobeView: FC<{}> = () => {
    const { savedFigures = [], setSavedFigures = null, loadAvatarData = null, getFigureString = null, gender = null } = useAvatarEditor();
    const maxSlots = GetConfigurationValue<number>('avatar.wardrobe.max.slots', DEFAULT_SLOT_COUNT);

    const slots = useMemo(() => {
        return Array.from({ length: maxSlots }, (_, index) => {
            const entry = savedFigures?.[index];

            if (!entry || !Array.isArray(entry)) return [null, null] as [IAvatarFigureContainer, string];

            return entry;
        });
    }, [maxSlots, savedFigures]);

    const columns = useMemo(() => {
        const next: [IAvatarFigureContainer, string][][] = [];

        for (let index = 0; index < slots.length; index += SLOTS_PER_COL) {
            next.push(slots.slice(index, index + SLOTS_PER_COL));
        }

        return next;
    }, [slots]);

    const wearFigureAtIndex = useCallback(
        (index: number) => {
            if (!isWardrobeSlotEnabled(index + 1) || index >= slots.length) return;

            const [figure] = slots[index];

            if (!figure) return;

            loadAvatarData(figure.getFigureString(), slots[index][1]);
        },
        [loadAvatarData, slots]
    );

    const saveFigureAtWardrobeIndex = useCallback(
        (index: number) => {
            if (!isWardrobeSlotEnabled(index + 1) || index >= slots.length) return;

            const newFigures = [...slots];
            const figure = getFigureString;

            newFigures[index] = [GetAvatarRenderManager().createFigureContainer(figure), gender];

            setSavedFigures(newFigures);
            SendMessageComposer(new SaveWardrobeOutfitMessageComposer(index + 1, figure, gender));
        },
        [gender, getFigureString, setSavedFigures, slots]
    );

    return (
        <aside className="volt-avatar-editor-wardrobe" aria-label={LocalizeText('avatareditor.wardrobe.title')}>
            <div className="volt-avatar-editor-wardrobe-header">
                <NativeText className="volt-avatar-editor-wardrobe-title" text={LocalizeText('avatareditor.wardrobe.title')} textStyle="u_bold" background={0xe9e9e1} overrides={{ color: 0x83827e }} />
                <img src={hcIconSrc} alt="" draggable={false} className="volt-avatar-editor-wardrobe-hc" />
            </div>
            <div className="volt-avatar-editor-wardrobe-slots">
                {columns.map((column, columnIndex) => (
                    <div className="volt-avatar-editor-wardrobe-column" key={`wardrobe-col-${columnIndex}`}>
                        {column.map((item, rowIndex) => {
                            const index = columnIndex * SLOTS_PER_COL + rowIndex;
                            const [figureContainer, slotGender] = item;
                            const enabled = isWardrobeSlotEnabled(index + 1);
                            const figureString = figureContainer?.getFigureString() ?? '';

                            return (
                                <div className="volt-avatar-editor-wardrobe-slot" key={`wardrobe-slot-${index}`}>
                                    <div className="volt-avatar-editor-wardrobe-slot-shade" />
                                    {enabled && (
                                        <button
                                            type="button"
                                            className="volt-avatar-editor-wardrobe-slot-set"
                                            aria-label={LocalizeText('avatareditor.wardrobe.save')}
                                            onClick={() => saveFigureAtWardrobeIndex(index)}
                                        />
                                    )}
                                    {enabled && (
                                        <button
                                            type="button"
                                            className="volt-avatar-editor-wardrobe-slot-get"
                                            aria-label={LocalizeText('widget.generic_usable.button.use')}
                                            onClick={() => wearFigureAtIndex(index)}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        className="volt-avatar-editor-wardrobe-slot-figure"
                                        disabled={!enabled || !figureContainer}
                                        aria-label={LocalizeText('widget.generic_usable.button.use')}
                                        onClick={() => wearFigureAtIndex(index)}
                                    >
                                        {enabled && figureContainer ? (
                                            <LayoutAvatarImageView direction={4} figure={figureString} gender={slotGender} fit />
                                        ) : !enabled ? (
                                            <img src={emptySlotSrc} alt="" draggable={false} className="volt-avatar-editor-wardrobe-empty" />
                                        ) : null}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </aside>
    );
};
