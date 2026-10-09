import { CSSProperties, FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';

interface InfoStandCenteredTextProps {
    width: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}

/**
 * Text centred inside a fixed-width box on a whole pixel. Centring with CSS leaves half-pixel
 * offsets that smear the Volter bitmap glyphs, while the Flash text fields land on integers.
 */
export const InfoStandCenteredText: FC<InfoStandCenteredTextProps> = ({ width, className = '', style = {}, children }) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const [offset, setOffset] = useState(0);

    useLayoutEffect(() => {
        const element = textRef.current;

        if (!element) return;

        let isCurrent = true;

        // Flash lays the text out one pixel narrower than the box the glyphs fill.
        const center = () => isCurrent && setOffset(Math.max(0, Math.floor((width - element.getBoundingClientRect().width) / 2) + 1));

        center();

        // The glyph widths change once the bitmap font has loaded.
        document.fonts?.ready.then(center);

        const observer = new ResizeObserver(center);

        observer.observe(element);

        return () => {
            isCurrent = false;
            observer.disconnect();
        };
    }, [children, width]);

    return (
        <div className={className} style={{ width, ...style }}>
            <span ref={textRef} style={{ display: 'inline-block', marginLeft: offset }}>
                {children}
            </span>
        </div>
    );
};
