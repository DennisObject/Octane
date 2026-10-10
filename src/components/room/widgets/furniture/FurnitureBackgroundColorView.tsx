import { ColorConverter } from '@volt/renderer';
import { FC, PointerEvent as ReactPointerEvent, useMemo } from 'react';
import { ColorUtils, LocalizeText } from '../../../../api';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { useFurnitureBackgroundColorWidget } from '../../../../hooks';

// background_color_ui (HabboRoomUICom): a 292x255 style 3 frame; the white panel, three dimmer-style sliders and two buttons are placed
// from the layout (content origin 6,25). The native thumbs sit 15px left of their track and 7px above it, which is kept.
const SLIDER_TRAVEL = 194;

const ToneSlider: FC<{ top: number; label: string; value: number; onChange: (value: number) => void }> = ({ top, label, value, onChange }) => {
    const move = (event: ReactPointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();

        onChange(Math.round(Math.min(1, Math.max(0, (event.clientX - bounds.left - 6) / SLIDER_TRAVEL)) * 255));
    };

    return (
        <>
            <span className="volt-toner__label" style={{ top: top + 2 }}>
                {label}
            </span>
            <div
                className="volt-toner__slider"
                style={{ top: top + 12 }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    move(event);
                }}
                onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && move(event)}
            >
                <span className="volt-toner__thumb" style={{ left: Math.round((value / 255) * SLIDER_TRAVEL) - 15 }} />
            </div>
        </>
    );
};

export const FurnitureBackgroundColorView: FC<{}> = () => {
    const {
        objectId = -1,
        hue = 0,
        saturation = 0,
        lightness = 0,
        setHue = null,
        setSaturation = null,
        setLightness = null,
        applyToner = null,
        toggleToner = null,
        onClose = null
    } = useFurnitureBackgroundColorWidget();

    const previewColor = useMemo(() => ColorConverter.hslToRGB(ColorUtils.eight_bitVals_to_int(0, hue, saturation, lightness)), [hue, saturation, lightness]);

    if (objectId === -1) return null;

    return (
        <VoltCardView className="volt-toner" frameStyle={3} isResizable={false} uniqueKey="volt-room-toner">
            <VoltCardHeaderView headerText={LocalizeText('widget.backgroundcolour.title')} onCloseClick={onClose} />
            <div className="volt-toner__panel" />
            <span className="volt-toner__info">{LocalizeText('widget.backgroundcolor.info')}</span>
            <div className="volt-toner__preview" style={{ backgroundColor: ColorUtils.makeColorNumberHex(previewColor) }} />
            <ToneSlider label={LocalizeText('widget.backgroundcolor.hue')} top={77} value={hue} onChange={setHue} />
            <ToneSlider label={LocalizeText('widget.backgroundcolor.saturation')} top={119} value={saturation} onChange={setSaturation} />
            <ToneSlider label={LocalizeText('widget.backgroundcolor.lightness')} top={161} value={lightness} onChange={setLightness} />
            <button className="volt-toner__button volt-toner__apply" type="button" onClick={applyToner}>
                {LocalizeText('widget.backgroundcolor.button.apply')}
            </button>
            <button className="volt-toner__button volt-toner__toggle" type="button" onClick={toggleToner}>
                {LocalizeText('widget.backgroundcolor.button.on')}
            </button>
        </VoltCardView>
    );
};
