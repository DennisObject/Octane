import { describe, expect, it } from 'vitest';
import {
    applyDraw,
    beginRect,
    endRect,
    heightAt,
    isReserved,
    loadOfficialMap,
    officialPlanData,
    paintRect,
    screenToTile,
    setHeightAt,
    setOccupiedMap,
    tileToScreen
} from './officialFloorPlan';

describe('official floor plan cache', () => {
    it('joins rows with CR and keeps a trailing CR', () => {
        const plan = loadOfficialMap('00\rxq\r');

        expect(officialPlanData(plan)).toBe('00\rxq\r');
        expect(heightAt(plan, 1, 1)).toBe(parseInt('q', 33));
    });

    it('does not paint a reserved tile, but the door tool can select it', () => {
        let plan = loadOfficialMap('00\r00');

        plan = setOccupiedMap(plan, [[false, true], [false, false]]);

        const painted = setHeightAt(plan, 1, 0, 4, false);

        expect(officialPlanData(painted.plan).split('\r')[0]).toBe('00');
        expect(isReserved(painted.plan, 1, 0)).toBe(true);

        const door = applyDraw(painted.plan, 1, 0, 'set_enter_tile', 0, false);

        expect(door.plan.entryX).toBe(1);
        expect(door.plan.entryY).toBe(0);
    });

    it('raises to 29 and leaves holes alone', () => {
        const plan = loadOfficialMap('t\rx');
        const raised = applyDraw(plan, 0, 0, 'increase_height', 0, false);
        const hole = applyDraw(plan, 0, 1, 'decrease_height', 0, false);

        expect(heightAt(raised.plan, 0, 0)).toBe(29);
        expect(officialPlanData(hole.plan).split('\r')[1]).toBe('x');
    });

    it('keeps the first row and first column as holes except the painted edge cell', () => {
        const plan = loadOfficialMap('0x\rxx');
        const blocked = setHeightAt(plan, 0, 1, 3, false);

        expect(heightAt(blocked.plan, 0, 1)).toBe(-1);

        const doorEdge = loadOfficialMap('xx\rxx');
        const allowed = setHeightAt(doorEdge, 0, 1, 3, false);

        expect(heightAt(allowed.plan, 0, 1)).toBe(3);
    });

    it('shift-drag repaints the rectangle from the temporary copy', () => {
        const plan = beginRect(loadOfficialMap('xxx\rxxx\rxxx'));
        const rect = paintRect(plan, 1, 1, 2, 2, 'add_tile', 4, false);
        const committed = endRect(rect.plan);

        expect(officialPlanData(committed).split('\r').slice(0, 3)).toEqual(['xxx', 'x44', 'x44']);
        expect(committed.buffer).toBeNull();
    });

    it('maps raw bitmap pixels with trunc toward zero and ignores the blit origin', () => {
        expect(screenToTile(0, 0, 1, 2)).toEqual({ x: -1, y: 1 });
        expect(screenToTile(8, 4, 1, 2)).toEqual({ x: 0, y: 1 });
        expect(screenToTile(16, 8, 1, 2)).toEqual({ x: 1, y: 1 });
        expect(screenToTile(32, 16, 2, 2)).toEqual({ x: 1, y: 1 });

        const fractional = screenToTile(1, 0, 1, 2);

        expect(fractional.x === 0).toBe(true);
        expect(fractional.y).toBe(0);
        expect(Math.floor(1 / 16 - 2 / 2)).toBe(-1);

        const drawn = tileToScreen(1, 0, 1);
        const blitOrigin = { x: 8, y: 4 };

        expect(drawn).toEqual({ x: 8, y: 4 });
        expect(screenToTile(drawn.x, drawn.y, 1, 2)).toEqual({ x: 0, y: 1 });
        expect(screenToTile(drawn.x - blitOrigin.x, drawn.y - blitOrigin.y, 1, 2)).toEqual({ x: -1, y: 1 });
        expect(screenToTile(16, 8, 1, 2)).not.toEqual(screenToTile(16 - blitOrigin.x, 8 - blitOrigin.y, 1, 2));
    });
});
