import { CSSProperties, FC, PointerEvent as ReactPointerEvent, ReactNode, useRef } from 'react';
import { LocalizeText, WiredSliderConverter, WIRED_SLIDER_ECHO } from '../../../api';
import { Slider, SliderProps } from '../../../common';
import sliderTrack from '../../../assets/images/wired/native/slider_track.png';
import sliderThumb from '../../../assets/images/wired/native/slider_obj.png';
import arrowLeft from '../../../assets/images/wired/native/arrow-left.png';
import arrowRight from '../../../assets/images/wired/native/arrow-right.png';
import { useWiredNative } from './WiredNativeContext';
import { WiredNumberInput } from './WiredNumberInput';
import { WiredSection, WiredSectionProps } from './WiredSection';
import { WiredShellButton } from './WiredShellHeaderView';

const THUMB_WIDTH = 12;

export interface WiredSliderProps {
    min: number;
    max: number;
    step?: number;
    value: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}

/** SliderPreset: arrow buttons around a 12px thumb that travels the track width minus its own width. */
export const WiredSlider: FC<WiredSliderProps> = ({ min, max, step = 1, value, disabled = false, onChange }) => {
    const areaRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ startX: number; startValue: number } | null>(null);
    const clamp = (next: number) => Math.min(max, Math.max(min, next));
    const travel = () => (areaRef.current?.clientWidth ?? 148) - THUMB_WIDTH;
    const position = max === min ? 0 : Math.trunc(travel() * ((clamp(value) - min) / (max - min)));

    const onThumbDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled || event.button !== 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX, startValue: value };
    };

    const onThumbMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;

        const startPosition = Math.trunc(travel() * ((clamp(drag.current.startValue) - min) / (max - min)));
        const x = Math.min(travel(), Math.max(0, startPosition + event.clientX - drag.current.startX));
        const raw = (x / travel()) * (max - min) + min;
        const next = clamp(Math.round(raw / step) * step);

        if (next !== value) onChange(next);
    };

    const onThumbUp = () => {
        drag.current = null;
    };

    return (
        <div className="volt-wired__slider-row">
            <WiredShellButton className="volt-wired__icon-button" disabled={disabled} shellStyle="illumina" onClick={() => onChange(clamp(value - step))}>
                <img alt="" draggable={false} src={arrowLeft} />
            </WiredShellButton>
            <div className="volt-wired__slider" style={{ '--wired-slider-bg': `url(${sliderTrack})` } as CSSProperties}>
                <div className="volt-wired__slider-area" ref={areaRef}>
                    <div
                        className="volt-wired__slider-thumb"
                        style={{ left: position, backgroundImage: `url(${sliderThumb})` }}
                        onPointerCancel={onThumbUp}
                        onPointerDown={onThumbDown}
                        onPointerMove={onThumbMove}
                        onPointerUp={onThumbUp}
                    />
                </div>
            </div>
            <WiredShellButton className="volt-wired__icon-button" disabled={disabled} shellStyle="illumina" onClick={() => onChange(clamp(value + step))}>
                <img alt="" draggable={false} src={arrowRight} />
            </WiredShellButton>
        </div>
    );
};

export interface WiredSliderSectionProps extends Omit<WiredSectionProps, 'title' | 'headerOption'> {
    /** Localization key of the title; its %unit% (and the value it is built with) come from the converter. */
    titleKey: string;
    unit?: string;
    converter?: WiredSliderConverter;
    min: number;
    max: number;
    step?: number;
    value: number;
    withInput?: boolean;
    inputWidth?: number;
    headerOptionsRight?: ReactNode;
    onChange: (value: number) => void;
}

/** SliderSection: titled slider with an optional number input; without the input the title carries the value. */
export const WiredSliderSection: FC<WiredSliderSectionProps> = ({
    titleKey,
    unit = '',
    converter = WIRED_SLIDER_ECHO,
    min,
    max,
    step = 1,
    value,
    withInput = true,
    inputWidth = 40,
    onChange,
    ...rest
}) => {
    const title = unit ? LocalizeText(titleKey, [unit], [converter.toString(value)]) : LocalizeText(titleKey);

    return (
        <WiredSection
            {...rest}
            headerOption={
                withInput ? (
                    <WiredNumberInput endsWithFive={converter.endsWithFive} max={max} min={min} precision={converter.precision} value={value} width={inputWidth} onChange={onChange} />
                ) : null
            }
            title={title}
            titleOffset={withInput ? 2 : 0}
        >
            <WiredSlider max={max} min={min} step={step} value={value} onChange={onChange} />
        </WiredSection>
    );
};

/** Drop-in for the shared Slider: the native arrow slider in the Illumina frame, the shared one elsewhere. */
export const WiredLegacySlider: FC<SliderProps> = (props) => {
    const native = useWiredNative();
    const { min = 0, max = 100, step = 1, value, disabled = false, onChange } = props;

    if (!native || Array.isArray(value)) return <Slider {...props} />;

    return <WiredSlider disabled={disabled} max={max} min={min} step={step} value={typeof value === 'number' ? value : 0} onChange={(next) => onChange?.(next, 0)} />;
};
