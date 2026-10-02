import { PointerEvent as ReactPointerEvent, FC, useEffect, useRef } from 'react';
import { AIR_FLOOR_ASSETS } from '../air/airAssets';
import { FloorplanSkinScrollbar } from './FloorplanSkinScrollbar';
import { airHeightMultipliers, applyTileColor } from '../air/airHeightColor';
import {
    OfficialDrawMode,
    OfficialFloorPlan,
    applyDraw,
    beginRect,
    endRect,
    heightAt,
    interpolationPoints,
    isEntry,
    isReserved,
    paintRect,
    screenToTile,
    tileToScreen
} from '../official/officialFloorPlan';

type Props = {
    plan: OfficialFloorPlan;
    zoom: 1 | 2;
    mode: OfficialDrawMode;
    drawingHeight: number;
    largeFloorPlans: boolean;
    onPlan: (plan: OfficialFloorPlan, limited: boolean) => void;
};

type PlacedTile = { x: number; y: number; image: CanvasImageSource };

const tintCache = new Map<string, HTMLCanvasElement>();

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(src));
        image.src = src;
    });

const tintTile = (base: HTMLImageElement, level: number, occupied: boolean): HTMLCanvasElement => {
    const key = `${base.src}:${level}:${occupied ? 1 : 0}`;
    const cached = tintCache.get(key);

    if (cached) return cached;

    const canvas = document.createElement('canvas');

    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;

    const context = canvas.getContext('2d');

    if (!context) return canvas;

    const [redMultiplier, greenMultiplier, blueMultiplier] = airHeightMultipliers(level, occupied);

    context.drawImage(base, 0, 0);

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;

    for (let index = 0; index < data.length; index += 4) {
        const [red, green, blue, alpha] = applyTileColor(data[index], data[index + 1], data[index + 2], data[index + 3], redMultiplier, greenMultiplier, blueMultiplier);

        data[index] = red;
        data[index + 1] = green;
        data[index + 2] = blue;
        data[index + 3] = alpha;
    }

    context.putImageData(image, 0, 0);
    tintCache.set(key, canvas);

    return canvas;
};

const layoutTiles = (plan: OfficialFloorPlan, zoom: 1 | 2, base: HTMLImageElement, entry: HTMLImageElement): { width: number; height: number; offsetX: number; offsetY: number; tiles: PlacedTile[] } => {
    const tiles: PlacedTile[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let y = 0; y < plan.height; y++) {
        for (let x = 0; x < plan.width; x++) {
            const point = tileToScreen(x, y, zoom);

            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);

            if (isEntry(plan, x, y)) {
                tiles.push({ x: point.x, y: point.y, image: entry });
                continue;
            }

            const level = Math.min(heightAt(plan, x, y), 29);

            if (level >= 0) tiles.push({ x: point.x, y: point.y, image: tintTile(base, level, isReserved(plan, x, y)) });
        }
    }

    if (tiles.length === 0 && plan.width === 0) {
        return { width: 18, height: 27, offsetX: 0, offsetY: 0, tiles: [] };
    }

    const offsetX = Number.isFinite(minX) ? -minX : 0;
    const offsetY = Number.isFinite(minY) ? -minY : 0;

    return {
        width: Math.max(1, (Number.isFinite(maxX) ? maxX : 0) - (Number.isFinite(minX) ? minX : 0) + 18),
        height: Math.max(1, (Number.isFinite(maxY) ? maxY : 0) - (Number.isFinite(minY) ? minY : 0) + 27),
        offsetX,
        offsetY,
        tiles
    };
};

export const FloorplanOfficialCanvas: FC<Props> = ({ plan, zoom, mode, drawingHeight, largeFloorPlans, onPlan }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<{ base: HTMLImageElement; entry: HTMLImageElement; baseLarge: HTMLImageElement; entryLarge: HTMLImageElement } | null>(null);
    const drawingRef = useRef(false);
    const rectRef = useRef(false);
    const originRef = useRef<{ x: number; y: number } | null>(null);
    const lastRef = useRef<{ x: number; y: number } | null>(null);
    const planRef = useRef(plan);
    const zoomRef = useRef(zoom);
    const centeredRef = useRef(false);

    planRef.current = plan;
    zoomRef.current = zoom;

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            loadImage(AIR_FLOOR_ASSETS.tileBase),
            loadImage(AIR_FLOOR_ASSETS.tileEntry),
            loadImage(AIR_FLOOR_ASSETS.tileBaseLarge),
            loadImage(AIR_FLOOR_ASSETS.tileEntryLarge)
        ]).then(([base, entry, baseLarge, entryLarge]) => {
            if (cancelled) return;
            imagesRef.current = { base, entry, baseLarge, entryLarge };
            paint();
        }).catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    const paint = () => {
        const canvas = canvasRef.current;
        const images = imagesRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context || !images) return;

        const activeZoom = zoomRef.current;
        const base = activeZoom === 1 ? images.base : images.baseLarge;
        const entry = activeZoom === 1 ? images.entry : images.entryLarge;
        const laid = layoutTiles(planRef.current, activeZoom, base, entry);

        canvas.width = laid.width;
        canvas.height = laid.height;
        context.fillStyle = '#000000';
        context.fillRect(0, 0, laid.width, laid.height);

        for (const tile of laid.tiles) context.drawImage(tile.image, tile.x + laid.offsetX, tile.y + laid.offsetY);

        const scroller = scrollerRef.current;

        // centerScrollableViews runs from the visible setter, not from updateView or zoom.
        if (!centeredRef.current && scroller && scroller.clientWidth > 0 && scroller.clientHeight > 0) {
            scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
            scroller.scrollTop = Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2);
            centeredRef.current = true;
        }
    };

    useEffect(() => {
        paint();
    }, [plan, zoom]);

    const tileFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;

        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        const localX = (event.clientX - rect.left) * scaleX;
        const localY = (event.clientY - rect.top) * scaleY;

        return screenToTile(localX, localY, zoomRef.current, planRef.current.height);
    };

    const publish = (nextPlan: OfficialFloorPlan, limited: boolean) => {
        planRef.current = nextPlan;
        onPlan(nextPlan, limited);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (event.button !== 0) return;

        event.currentTarget.setPointerCapture?.(event.pointerId);

        const hit = tileFromEvent(event);

        if (!hit) return;

        drawingRef.current = true;
        lastRef.current = { x: -1000, y: -1000 };

        let current = planRef.current;
        const rectDrag = event.shiftKey;

        if (rectDrag) {
            rectRef.current = true;
            originRef.current = hit;
            current = beginRect(current);
        }

        const edit = applyDraw(current, hit.x, hit.y, mode, drawingHeight, largeFloorPlans);

        lastRef.current = hit;
        publish(edit.plan, edit.limited);

        if (edit.limited) drawingRef.current = false;
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;

        const hit = tileFromEvent(event);

        if (!hit) return;

        if (rectRef.current && originRef.current) {
            const edit = paintRect(planRef.current, originRef.current.x, originRef.current.y, hit.x, hit.y, mode, drawingHeight, largeFloorPlans);

            publish(edit.plan, edit.limited);
            return;
        }

        const last = lastRef.current;

        if (!last || (last.x === hit.x && last.y === hit.y)) return;

        let current = planRef.current;
        let limited = false;
        const first = applyDraw(current, hit.x, hit.y, mode, drawingHeight, largeFloorPlans);

        current = first.plan;
        limited = first.limited;

        if (last.x !== -1000) {
            for (const point of interpolationPoints(last.x, last.y, hit.x, hit.y)) {
                if ((point.x === last.x && point.y === last.y) || (point.x === hit.x && point.y === hit.y)) continue;

                const edit = applyDraw(current, point.x, point.y, mode, drawingHeight, largeFloorPlans);

                current = edit.plan;
                limited = limited || edit.limited;
            }
        }

        lastRef.current = hit;
        publish(current, limited);

        if (limited) drawingRef.current = false;
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        if (rectRef.current) {
            rectRef.current = false;
            originRef.current = null;
            publish(endRect(planRef.current), false);
        }

        lastRef.current = null;
    };

    return (
        <>
            <div ref={scrollerRef} className="fp-bc-scroll" data-testid="floorplan-official-scroll">
                <canvas
                    ref={canvasRef}
                    className="fp-bc-bitmap"
                    data-testid="floorplan-official-grid"
                    data-zoom={zoom}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                />
            </div>
            <FloorplanSkinScrollbar scrollerRef={scrollerRef} axis="vertical" slot={13} className="fp-bc-map-vbar" testId="floorplan-map-scroll-vertical" />
            <FloorplanSkinScrollbar scrollerRef={scrollerRef} axis="horizontal" slot={13} className="fp-bc-map-hbar" testId="floorplan-map-scroll-horizontal" />
        </>
    );
};
