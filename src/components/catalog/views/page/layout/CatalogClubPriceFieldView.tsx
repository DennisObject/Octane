import { FC, useLayoutEffect, useRef, useState } from 'react';

interface CatalogClubPriceFieldViewProps {
    value: string | number;
}

// AIR auto_size fields floor text width plus their 2px left/right gutters.
export const CatalogClubPriceFieldView: FC<CatalogClubPriceFieldViewProps> = ({ value }) =>
{
    const textRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<number>();

    useLayoutEffect(() =>
    {
        const text = textRef.current;

        if (!text) return;

        const measure = () => setWidth(Math.floor(text.getBoundingClientRect().width + 4));

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(text);

        return () => observer.disconnect();
    }, [value]);

    return (
        <span className="volt-club-price-field" style={{ width }}>
            <span ref={textRef} className="volt-club-price-field-text">
                {value}
            </span>
        </span>
    );
};
