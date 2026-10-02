/** FloorPlanCache + HeightMapEditor paint rules from WIN63-202609091217-117204808. */

export const OFFICIAL_LEVELS = 30;
export const OFFICIAL_RAISE_MAX = 29;
export const OFFICIAL_MAX_AXIS = 64;
export const OFFICIAL_MAX_AREA = 3025;

export type OfficialDrawMode = 'add_tile' | 'remove_tile' | 'increase_height' | 'decrease_height' | 'set_enter_tile';

export type OfficialFloorPlan = {
    rows: string[];
    width: number;
    height: number;
    reserved: boolean[][];
    entryX: number;
    entryY: number;
    entryDir: number;
    buffer: string[] | null;
    showedPopup: boolean;
};

export type PlanEdit = {
    plan: OfficialFloorPlan;
    limited: boolean;
};

export const emptyOfficialFloorPlan = (): OfficialFloorPlan => ({
    rows: [],
    width: 0,
    height: 0,
    reserved: [],
    entryX: 0,
    entryY: 0,
    entryDir: 0,
    buffer: null,
    showedPopup: false
});

const clone = (plan: OfficialFloorPlan): OfficialFloorPlan => ({
    ...plan,
    rows: plan.rows.slice(),
    reserved: plan.reserved.map((row) => row.slice()),
    buffer: plan.buffer ? plan.buffer.slice() : null
});

export const loadOfficialMap = (text: string): OfficialFloorPlan => {
    const plan = emptyOfficialFloorPlan();
    const parts = (text ?? '').split('\r');

    for (const part of parts) {
        if (part.length > 0) plan.rows.push(part);
    }

    measure(plan);
    return plan;
};

const measure = (plan: OfficialFloorPlan): void => {
    plan.width = 0;
    plan.height = 0;

    if (plan.rows.length === 0) return;

    const width = plan.rows[0].length;
    let height = 0;

    for (const row of plan.rows) {
        if (row.length === 0) break;
        height++;
    }

    plan.width = width;
    plan.height = height;
};

export const officialPlanData = (plan: OfficialFloorPlan): string => {
    let data = '';

    for (let index = 0; index < plan.rows.length; index++) data += `${plan.rows[index]}\r`;

    return data;
};

export const heightAt = (plan: OfficialFloorPlan, x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= plan.width || y >= plan.height) return -1;

    const char = plan.rows[y].charAt(x);

    if (char === 'x') return -1;

    const height = parseInt(char, 33);

    return Number.isNaN(height) ? -1 : height;
};

export const isReserved = (plan: OfficialFloorPlan, x: number, y: number): boolean => {
    const row = plan.reserved[y];

    if (!row || x < 0 || x >= row.length) return false;

    return row[x] === true;
};

export const isEntry = (plan: OfficialFloorPlan, x: number, y: number): boolean => plan.entryX === x && plan.entryY === y;

/** `(width - 1) * (height - 1) <= 3025` unless BUILDER_AT_WORK, and each axis <= 64. */
export const withinSize = (width: number, height: number, largeFloorPlans: boolean): boolean => {
    if (width > OFFICIAL_MAX_AXIS || height > OFFICIAL_MAX_AXIS) return false;
    if (!largeFloorPlans && (width - 1) * (height - 1) > OFFICIAL_MAX_AREA) return false;

    return true;
};

const setChar = (row: string, char: string, index: number): string => row.slice(0, index) + char + row.slice(index + 1);

const firstColumnAllows = (plan: OfficialFloorPlan, x: number, y: number): boolean => {
    for (let row = 0; row < plan.height; row++) {
        if (row !== y && plan.rows[row].charAt(0) !== 'x') return false;
    }

    return true;
};

const firstRowAllows = (plan: OfficialFloorPlan, x: number, y: number): boolean => {
    const row = plan.rows[0] ?? '';

    for (let col = 0; col < plan.width; col++) {
        if (col !== x && row.charAt(col) !== 'x') return false;
    }

    return true;
};

const allowDrawAt = (plan: OfficialFloorPlan, x: number, y: number, largeFloorPlans: boolean): boolean => {
    if (!withinSize(y + 1, x + 1, largeFloorPlans)) return false;
    if (x === 0 || y === 0) return firstColumnAllows(plan, x, y) && firstRowAllows(plan, x, y);

    return true;
};

const addColumn = (plan: OfficialFloorPlan, largeFloorPlans: boolean, silent: boolean): boolean => {
    if (!withinSize(plan.width + 1, plan.height, largeFloorPlans)) {
        if (!plan.showedPopup && !silent) plan.showedPopup = true;

        return false;
    }

    for (let row = 0; row < plan.height; row++) {
        if (plan.rows[row].length > 0) {
            plan.rows[row] += 'x';
            if (!plan.reserved[row]) plan.reserved[row] = [];
            plan.reserved[row].push(false);
        }
    }

    plan.width += 1;

    return true;
};

const addRow = (plan: OfficialFloorPlan, largeFloorPlans: boolean, silent: boolean): boolean => {
    if (!withinSize(plan.width, plan.height + 1, largeFloorPlans)) {
        if (!plan.showedPopup && !silent) plan.showedPopup = true;

        return false;
    }

    let row = '';

    for (let col = 0; col < plan.width; col++) row += 'x';

    plan.rows.push(row);
    plan.reserved.push(Array.from({ length: plan.width }, () => false));
    plan.height += 1;

    return true;
};

export const setOccupiedMap = (plan: OfficialFloorPlan, map: boolean[][]): OfficialFloorPlan => {
    if (plan.rows.length === 0) return plan;

    const next = clone(plan);

    next.reserved = [];

    for (let y = 0; y < next.height; y++) {
        const row: boolean[] = [];

        for (let x = 0; x < next.width; x++) row.push(map[y]?.[x] === true);

        next.reserved.push(row);
    }

    return next;
};

export const setHeightAt = (plan: OfficialFloorPlan, x: number, y: number, height: number, largeFloorPlans: boolean): PlanEdit => {
    const next = clone(plan);

    if (x < 0 || y < 0) return { plan: next, limited: false };
    if (!allowDrawAt(next, x, y, largeFloorPlans)) return { plan: next, limited: false };

    while (x >= next.width) {
        if (!addColumn(next, largeFloorPlans, false)) {
            return { plan: next, limited: next.showedPopup && !plan.showedPopup };
        }
    }

    while (y >= next.height) {
        if (!addRow(next, largeFloorPlans, false)) {
            return { plan: next, limited: next.showedPopup && !plan.showedPopup };
        }
    }

    if (isReserved(next, x, y)) return { plan: next, limited: false };

    const char = height < 0 ? 'x' : height.toString(33);

    next.rows[y] = setChar(next.rows[y], char, x);

    return { plan: next, limited: false };
};

const expandColumns = (plan: OfficialFloorPlan, x: number, largeFloorPlans: boolean): boolean => {
    while (x >= plan.width) {
        if (!addColumn(plan, largeFloorPlans, true)) return false;
    }

    return true;
};

const expandRows = (plan: OfficialFloorPlan, y: number, largeFloorPlans: boolean): boolean => {
    while (y >= plan.height) {
        if (!addRow(plan, largeFloorPlans, true)) return false;
    }

    return true;
};

export const applyDraw = (plan: OfficialFloorPlan, x: number, y: number, mode: OfficialDrawMode, drawingHeight: number, largeFloorPlans: boolean): PlanEdit => {
    if (mode === 'set_enter_tile') {
        if (heightAt(plan, x, y) >= 0) {
            const next = clone(plan);

            next.entryX = x;
            next.entryY = y;

            return { plan: next, limited: false };
        }

        return { plan, limited: false };
    }

    if (mode === 'increase_height' || mode === 'decrease_height') {
        const current = heightAt(plan, x, y);

        if (current < 0) return { plan, limited: false };

        const nextHeight = mode === 'increase_height' ? Math.min(OFFICIAL_RAISE_MAX, current + 1) : Math.max(0, current - 1);

        return setHeightAt(plan, x, y, nextHeight, largeFloorPlans);
    }

    if (mode === 'remove_tile') return setHeightAt(plan, x, y, -1, largeFloorPlans);

    return setHeightAt(plan, x, y, drawingHeight, largeFloorPlans);
};

export const beginRect = (plan: OfficialFloorPlan): OfficialFloorPlan => {
    const next = clone(plan);

    next.buffer = plan.rows.slice();

    return clearRect(next);
};

export const clearRect = (plan: OfficialFloorPlan): OfficialFloorPlan => {
    if (!plan.buffer) return plan;

    const next = clone(plan);

    next.rows = plan.buffer.slice();
    next.buffer = plan.buffer.slice();
    measure(next);

    return next;
};

export const endRect = (plan: OfficialFloorPlan): OfficialFloorPlan => {
    const next = clone(plan);

    next.buffer = null;

    return next;
};

/** Shift-drag rectangle from HeightMapEditor.editorWindowProcedure. */
export const paintRect = (
    plan: OfficialFloorPlan,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    mode: OfficialDrawMode,
    drawingHeight: number,
    largeFloorPlans: boolean
): PlanEdit => {
    let left = Math.min(x0, x1);
    let right = Math.max(x0, x1);
    let top = Math.min(y0, y1);
    let bottom = Math.max(y0, y1);
    const working = clearRect(plan);
    let columnsOk = expandColumns(working, right, largeFloorPlans);
    let rowsOk = expandRows(working, bottom, largeFloorPlans);

    if (!columnsOk && !rowsOk) return { plan: working, limited: false };

    while (bottom >= top && !rowsOk) {
        bottom -= 1;
        rowsOk = expandRows(working, bottom, largeFloorPlans);
    }

    while (right >= left && !columnsOk) {
        right -= 1;
        columnsOk = expandColumns(working, right, largeFloorPlans);
    }

    if (!columnsOk || !rowsOk) return { plan: working, limited: false };

    const restored = clearRect(working);

    expandRows(restored, bottom, largeFloorPlans);
    expandColumns(restored, right, largeFloorPlans);

    let cursor = restored;
    let limited = false;

    for (let x = left; x <= right; x++) {
        for (let y = top; y <= bottom; y++) {
            const edit = applyDraw(cursor, x, y, mode, drawingHeight, largeFloorPlans);

            cursor = edit.plan;
            limited = limited || edit.limited;
        }
    }

    cursor.buffer = plan.buffer ? plan.buffer.slice() : cursor.buffer;

    return { plan: cursor, limited };
};

export type GridPoint = { x: number; y: number };

/** class_4279.interpolationPoints. Endpoints are included. */
export const interpolationPoints = (x0: number, y0: number, x1: number, y1: number): GridPoint[] => {
    if (Math.abs(y1 - y0) < Math.abs(x1 - x0)) {
        return x0 > x1 ? interpolationLow(x1, y1, x0, y0) : interpolationLow(x0, y0, x1, y1);
    }

    return y0 > y1 ? interpolationHigh(x1, y1, x0, y0) : interpolationHigh(x0, y0, x1, y1);
};

const interpolationLow = (x0: number, y0: number, x1: number, y1: number): GridPoint[] => {
    const points: GridPoint[] = [];
    const run = x1 - x0;
    let rise = y1 - y0;
    let step = 1;

    if (rise < 0) {
        step = -1;
        rise = -rise;
    }

    let error = 2 * rise - run;
    let y = y0;

    for (let x = x0; x <= x1; x++) {
        points.push({ x, y });

        if (error > 0) {
            y += step;
            error += 2 * (rise - run);
        } else {
            error += 2 * rise;
        }
    }

    return points;
};

const interpolationHigh = (x0: number, y0: number, x1: number, y1: number): GridPoint[] => {
    const points: GridPoint[] = [];
    let run = x1 - x0;
    const rise = y1 - y0;
    let step = 1;

    if (run < 0) {
        step = -1;
        run = -run;
    }

    let error = 2 * run - rise;
    let x = x0;

    for (let y = y0; y <= y1; y++) {
        points.push({ x, y });

        if (error > 0) {
            x += step;
            error += 2 * (run - rise);
        } else {
            error += 2 * run;
        }
    }

    return points;
};

export const screenToTile = (pixelX: number, pixelY: number, zoom: number, floorHeight: number): GridPoint => {
    const sx = pixelX / 16 / zoom;
    const sy = pixelY / 8 / zoom;
    const tileX = Math.trunc(sy + (sx - floorHeight / 2));
    const tileY = Math.trunc(sy - (sx - floorHeight / 2));

    return { x: tileX, y: tileY };
};

export const tileToScreen = (x: number, y: number, zoom: number): GridPoint => ({
    x: zoom * 8 * (x - y),
    y: zoom * 4 * (x + y)
});

export const thicknessWire = (selection: number): number => {
    if (selection === 0) return -2;
    if (selection === 1) return -1;
    if (selection === 3) return 1;

    return 0;
};

export const thicknessSelection = (multiplier: number): number => {
    if (multiplier === 0.25) return 0;
    if (multiplier === 0.5) return 1;
    if (multiplier === 2) return 3;

    return 2;
};

export const wrapDirection = (dir: number): number => {
    if (dir < 0) return 7;
    if (dir > 7) return 0;

    return dir;
};
