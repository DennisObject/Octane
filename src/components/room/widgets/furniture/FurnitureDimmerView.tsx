import { RoomEngineTriggerWidgetEvent } from '@volt/renderer';
import { CSSProperties, FC, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { ColorUtils, FurnitureDimmerUtilities, GetConfigurationValue, LocalizeText } from '../../../../api';
import { DraggableWindow } from '../../../../common';
import { useFurnitureDimmerWidget, useVoltEvent } from '../../../../hooks';
import { InfoStandCenteredText } from '../avatar-info/infostand/InfoStandCenteredText';
import dimmerInfoImage from '../../../../assets/images/room-widgets/dimmer-widget/info.png';

// dimmer_ui (HabboRoomUICom): a 274x222 frame, tab buttons over a panel, 7 colour cells, a 194px slider,
// a checkbox and a 90x24 apply button; the off state shows dimmer_info in a plain box.
const SLIDER_TRAVEL = 194;

const cellStyle = (index: number): CSSProperties => ({ left: 26 + index * 29 });

export const FurnitureDimmerView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const {
        presets = [],
        dimmerState = 0,
        selectedPresetId = 0,
        color = 0xffffff,
        brightness = 0xff,
        effectId = 0,
        selectedColor = 0,
        setSelectedColor = null,
        selectedBrightness = 0,
        setSelectedBrightness = null,
        selectedEffectId = 0,
        setSelectedEffectId = null,
        selectPresetId = null,
        applyChanges
    } = useFurnitureDimmerWidget();

    const onClose = () => {
        FurnitureDimmerUtilities.previewDimmer(color, brightness, effectId === 2);

        setIsVisible(false);
    };

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REMOVE_DIMMER, () => setIsVisible(false));

    useEffect(() => {
        if (!presets || !presets.length) return;

        setIsVisible(true);
    }, [presets]);

    if (!isVisible) return null;

    const isFreeColorMode = GetConfigurationValue<boolean>('widget.dimmer.colorwheel', false);
    const isOn = dimmerState === 1;
    const range = FurnitureDimmerUtilities.MAX_BRIGHTNESS - FurnitureDimmerUtilities.MIN_BRIGHTNESS;
    const thumbLeft = Math.round(((Math.min(Math.max(selectedBrightness, FurnitureDimmerUtilities.MIN_BRIGHTNESS), FurnitureDimmerUtilities.MAX_BRIGHTNESS) - FurnitureDimmerUtilities.MIN_BRIGHTNESS) / range) * SLIDER_TRAVEL);

    const moveThumb = (event: ReactPointerEvent<HTMLDivElement>) => {
        const bounds = sliderRef.current?.getBoundingClientRect();

        if (!bounds) return;

        const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left - 6) / SLIDER_TRAVEL));

        setSelectedBrightness(Math.round(FurnitureDimmerUtilities.MIN_BRIGHTNESS + ratio * range));
    };

    const onSliderDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveThumb(event);
    };

    const onSliderMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveThumb(event);
    };

    return (
        <DraggableWindow handleSelector=".volt-dimmer__header" uniqueKey="volt-room-dimmer">
            <section aria-label={LocalizeText('widget.dimmer.title')} className="volt-dimmer" role="dialog">
                <div className="volt-dimmer__header">
                    <InfoStandCenteredText className="volt-dimmer__title" width={265}>
                        <span className="volt-dimmer__title-text">{LocalizeText('widget.dimmer.title')}</span>
                    </InfoStandCenteredText>
                    <button aria-label={LocalizeText('generic.close')} className="volt-dimmer__close" type="button" onClick={onClose} />
                </div>
                {!isOn && (
                    <>
                        <div className="volt-dimmer__box" />
                        <img alt="" className="volt-dimmer__info-image" draggable={false} src={dimmerInfoImage} />
                        <div className="volt-dimmer__off-text">{LocalizeText('widget.dimmer.info.off')}</div>
                    </>
                )}
                {isOn && (
                    <>
                        <div className="volt-dimmer__panel" />
                        <div className={`volt-dimmer__tabs is-tab-${Math.min(3, Math.max(1, selectedPresetId))}`} />
                        {presets.map((preset, index) => (
                            <button key={preset.id} className="volt-dimmer__tab" style={{ left: [15, 75, 138][index] }} type="button" onClick={() => selectPresetId(preset.id)}>
                                <InfoStandCenteredText width={index === 0 ? 60 : 63}>{LocalizeText(`widget.dimmer.tab.${preset.id}`)}</InfoStandCenteredText>
                            </button>
                        ))}
                        {isFreeColorMode && (
                            <input
                                className="volt-dimmer__color-input"
                                type="color"
                                value={ColorUtils.makeColorNumberHex(selectedColor)}
                                onChange={(event) => setSelectedColor(ColorUtils.convertFromHex(event.target.value))}
                            />
                        )}
                        {!isFreeColorMode &&
                            FurnitureDimmerUtilities.AVAILABLE_COLORS.map((available, index) => (
                                <button key={index} className="volt-dimmer__cell" style={cellStyle(index)} type="button" onClick={() => setSelectedColor(available)}>
                                    <span className="volt-dimmer__cell-color" style={{ backgroundColor: FurnitureDimmerUtilities.HTML_COLORS[index] }} />
                                    {available === selectedColor && <span className="volt-dimmer__cell-selected" />}
                                </button>
                            ))}
                        <div ref={sliderRef} className="volt-dimmer__slider" onPointerDown={onSliderDown} onPointerMove={onSliderMove}>
                            <span className="volt-dimmer__thumb" style={{ left: thumbLeft }} />
                        </div>
                        <button
                            aria-checked={selectedEffectId === 2}
                            className={'volt-dimmer__checkbox' + (selectedEffectId === 2 ? ' is-checked' : '')}
                            role="checkbox"
                            type="button"
                            onClick={() => setSelectedEffectId(selectedEffectId === 2 ? 1 : 2)}
                        />
                        <span className="volt-dimmer__checkbox-text">{LocalizeText('widget.dimmer.type.checkbox')}</span>
                        <div className="volt-dimmer__info">{LocalizeText('widget.dimmer.info')}</div>
                    </>
                )}
                <button className="volt-dimmer__button volt-dimmer__apply" disabled={!isOn} type="button" onClick={applyChanges}>
                    {LocalizeText('widget.dimmer.button.apply')}
                </button>
                <button className="volt-dimmer__button volt-dimmer__toggle" type="button" onClick={() => FurnitureDimmerUtilities.changeState()}>
                    {LocalizeText(isOn ? 'widget.dimmer.button.off' : 'widget.dimmer.button.on')}
                </button>
            </section>
        </DraggableWindow>
    );
};
