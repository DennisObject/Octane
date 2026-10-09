import { FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../../common/native-text/NativeText';

interface RoomPromoteFieldProps {
    label: string;
    value: string;
    maxLength: number;
    y: number;
    height: number;
    multiline?: boolean;
    isError?: boolean;
    onChange: (value: string) => void;
    onBlur: () => void;
}

/**
 * An iro_event_settings input TextField (217px wide, 1px border). While it is focused, or whenever the v75 raster would not fit, the browser
 * draws the text so caret, selection and IME stay the browser's; at rest the v75 raster is drawn inside the field's border, clipped to its
 * interior like the native field: 215px wide, and its text bitmap ends 2px above the field's bottom edge (a single line is clipped there, a wrapped
 * description must fit).
 */
export const RoomPromoteField: FC<RoomPromoteFieldProps> = ({ label, value, maxLength, y, height, multiline = false, isError = false, onChange, onBlur }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [rasterFits, setRasterFits] = useState(false);

    useLayoutEffect(() => {
        const field = overlayRef.current?.firstElementChild?.firstElementChild as HTMLElement | null;

        if (!field) return;

        const measure = () => setRasterFits(field.dataset.nativeText !== 'fallback' && field.offsetWidth <= 215 && (!multiline || field.offsetHeight <= height - 2));
        const observer = new ResizeObserver(measure);
        const mutations = new MutationObserver(measure);

        measure();
        observer.observe(field);
        mutations.observe(field, { attributes: true, attributeFilter: ['data-native-text'] });

        return () => {
            observer.disconnect();
            mutations.disconnect();
        };
    }, [value, height, multiline]);

    const showRaster = !isEditing && rasterFits && value.length > 0;
    const props = {
        'aria-label': label,
        className: `octane-room-promote-edit__input${isError ? ' is-error' : ''}${showRaster ? ' is-raster' : ''}`,
        maxLength,
        style: { top: y, height },
        value,
        onBlur: () => {
            setIsEditing(false);
            onBlur();
        },
        onFocus: () => setIsEditing(true)
    };

    return (
        <>
            {multiline ? <textarea {...props} onChange={(event) => onChange(event.target.value)} /> : <input {...props} type="text" onChange={(event) => onChange(event.target.value)} />}
            <div ref={overlayRef} aria-hidden="true" className={`octane-room-promote-edit__raster${showRaster ? '' : ' is-hidden'}`} style={{ top: y + 1, left: 1, width: 215, height: height - 3 }}>
                <div style={{ position: 'absolute', left: -1, top: -1 }}>
                    <NativeText background={isError ? 0xffe91b : 0xffffff} maxWidth={multiline ? 217 : undefined} nativeResolution text={value} textStyle="u_regular" />
                </div>
            </div>
        </>
    );
};
