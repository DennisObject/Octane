import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AIR_PREVIEW_TILES } from '../air/airAssets';
import { OfficialFloorPlan, heightAt, isEntry } from '../official/officialFloorPlan';
import { FloorplanSkinScrollbar } from './FloorplanSkinScrollbar';

type Props = {
    plan: OfficialFloorPlan;
    onDrawn?: () => void;
};

/** Edge mask from FloorPlanPreviewer.updatePreview. A full mask (15) draws the plain tile. */
const previewIndex = (plan: OfficialFloorPlan, col: number, row: number, height: number): number => {
    if (isEntry(plan, col, row)) return AIR_PREVIEW_TILES.length - 1;
    const above = height + 1;
    const same = (dx: number, dy: number) => heightAt(plan, col + dx, row + dy) === above;
    let mask = 0;
    if (same(-1, -1) || same(0, -1) || same(-1, 0)) mask |= 1;
    if (same(1, -1) || same(0, -1) || same(1, 0)) mask |= 2;
    if (same(-1, 1) || same(0, 1) || same(-1, 0)) mask |= 4;
    if (same(1, 1) || same(0, 1) || same(1, 0)) mask |= 8;
    if (mask === 15) mask = 0;
    return mask;
};

export const FloorplanOfficialPreview: FC<Props> = ({ plan, onDrawn }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const centeredRef = useRef(false);
    const onDrawnRef = useRef(onDrawn);
    const [barHost, setBarHost] = useState<Element | null>(null);

    onDrawnRef.current = onDrawn;

    useEffect(() => {
        setBarHost(scrollerRef.current?.closest('.fp-bc-side') ?? null);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const images = AIR_PREVIEW_TILES.map((src) => {
            const image = new Image();
            image.src = src;
            return image;
        });

        let cancelled = false;
        const draw = () => {
            if (cancelled) return;
            const placed: { x: number; y: number; index: number }[] = [];
            let minX = Number.POSITIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;

            for (let row = 0; row < plan.height; row++) {
                for (let col = 0; col < plan.width; col++) {
                    const height = heightAt(plan, col, row);
                    if (height < 0) continue;
                    const x = 8 * (col - row);
                    const y = 4 * (col + row) - 8 * height;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    placed.push({ x, y, index: previewIndex(plan, col, row, height) });
                }
            }

            if (placed.length === 0) {
                canvas.width = 1;
                canvas.height = 1;
                context.clearRect(0, 0, 1, 1);
                centerOnce();
                onDrawnRef.current?.();
                return;
            }

            const width = Math.min(maxX - minX + 18, 4095);
            const height = Math.min(maxY - minY + 18, 4095);
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            for (const tile of placed) {
                const image = images[tile.index];
                if (!image || !image.complete || image.naturalWidth === 0) continue;
                context.drawImage(image, tile.x - minX, tile.y - minY);
            }
            centerOnce();
            onDrawnRef.current?.();
        };

        const centerOnce = () => {
            const scroller = scrollerRef.current;

            if (centeredRef.current || !scroller || scroller.clientWidth <= 0 || scroller.clientHeight <= 0) return;

            scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
            scroller.scrollTop = Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2);
            centeredRef.current = true;
        };

        let pending = images.length;
        const ready = () => {
            pending -= 1;
            if (pending <= 0) draw();
        };
        for (const image of images) {
            if (image.complete) ready();
            else {
                image.addEventListener('load', ready, { once: true });
                image.addEventListener('error', ready, { once: true });
            }
        }

        return () => {
            cancelled = true;
        };
    }, [plan]);

    const bars = (
        <>
            <FloorplanSkinScrollbar scrollerRef={scrollerRef} axis="vertical" slot={20} className="fp-bc-preview-vbar" testId="floorplan-preview-scroll-vertical" />
            <FloorplanSkinScrollbar scrollerRef={scrollerRef} axis="horizontal" slot={14} className="fp-bc-preview-hbar" testId="floorplan-preview-scroll-horizontal" />
        </>
    );

    return (
        <>
            <div ref={scrollerRef} className="fp-bc-preview-scroll" data-testid="floorplan-preview-scroll">
                <canvas ref={canvasRef} className="fp-bc-preview-bitmap" data-testid="floorplan-preview-2d" />
            </div>
            {barHost ? createPortal(bars, barHost) : null}
        </>
    );
};
