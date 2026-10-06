import { FC, memo } from 'react';

export const NATIVE_TEXT_HALO_FILTER_ID = 'octane-native-text-halo';

/**
 * The native Flash text rasteriser leaves a faint 1px cross-shaped halo (about 17%
 * of white) around every glyph on the dark panels. Elements opt in with
 * `filter: var(--octane-native-text-halo)`.
 */
export const NativeTextHaloFilter: FC<{}> = memo(() => (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id={NATIVE_TEXT_HALO_FILTER_ID} colorInterpolationFilters="sRGB" x="-10%" y="-25%" width="120%" height="150%">
            <feConvolveMatrix in="SourceAlpha" order="3" kernelMatrix="0 1 0 1 0 1 0 1 0" divisor="1" edgeMode="none" result="neighbours" />
            <feComponentTransfer in="neighbours" result="halo-alpha">
                <feFuncA type="linear" slope="0.17" />
            </feComponentTransfer>
            <feFlood floodColor="#fefefe" />
            <feComposite in2="halo-alpha" operator="in" result="halo" />
            <feMerge>
                <feMergeNode in="halo" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </svg>
));

NativeTextHaloFilter.displayName = 'NativeTextHaloFilter';
