import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('RoomToolsWidgetView AIR toolbar', () => {
const source = readFileSync(join(process.cwd(), 'src/components/room/widgets/room-tools/RoomToolsWidgetView.tsx'), 'utf8');
const helpers = readFileSync(join(process.cwd(), 'src/components/room/widgets/room-tools/roomZoom.helpers.ts'), 'utf8');

    it('renders level controls and a collapsible side rail', () => {
        expect(source).toContain('room-tools-zoom-row');
        expect(source).toContain('room-tools-zoom-button');
        expect(source).toContain('room-tools-collapse-toggle');
        expect(source).toContain("LocalizeText('room.zoom.text', ['zoom_level'], [getZoomText(zoomScale)])");
    });

    it('keeps renderer zoom side effects outside React state updaters', () => {
        expect(source).not.toMatch(/setZoomScale\s*\([^)]*=>[\s\S]{0,500}applyRoomZoom/);
        expect(source).toContain('getNextZoomScale(currentScale, direction)');
        expect(source).toContain('applyRoomZoom(roomSession.roomId, logicalScale)');
    });

    it('drops the room geometry to size-32 below 1x for crisp zoomed-out furni', () => {
        expect(helpers).toContain('geometry.performZoomOut()');
        expect(helpers).toContain('geometry.performZoomIn()');
        expect(helpers).toContain('RoomGeometry.SCALE_ZOOMED_IN / RoomGeometry.SCALE_ZOOMED_OUT');
    });

    it('tracks zoom changes triggered outside the toolbar', () => {
        expect(source).toContain('RoomEngineEvent.ROOM_ZOOMED');
        expect(source).toContain('updateZoomScale();');
        expect(source).toContain('}, [roomSession?.roomId]);');
    });
});
