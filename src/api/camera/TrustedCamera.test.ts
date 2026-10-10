import { GetRenderer, GetRoomEngine, GetRoomSessionManager } from '@volt/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelTrustedCameraRequests, captureTrustedCamera, completeTrustedCameraRequest, getTrustedCameraViewport, renderTrustedCamera } from './TrustedCamera';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../volt/SendMessageComposer', () => ({ SendMessageComposer: mocks.send }));
vi.mock('@volt/renderer', () => {
    class Composer {
        private data: unknown[] = [];
        getMessageArray() {
            return this.data;
        }
    }
    return {
        GetRenderer: vi.fn(),
        GetRoomEngine: vi.fn(),
        GetRoomSessionManager: vi.fn(),
        VoltRectangle: class {},
        RenderRoomMessageComposer: Composer,
        RenderRoomThumbnailMessageComposer: Composer,
        RoomGeometry: { SCALE_ZOOMED_IN: 64 }
    };
});

const draftId = '12e347bf-22d3-4bbb-ae86-386ca07a6b0d';
const url = '/camera/12e347bf22d34bbbae86386ca07a6b0d.png';
const viewport = {
    width: 1280,
    height: 900,
    offsetX: 0,
    offsetY: 0,
    x: 400,
    y: 200,
    cropWidth: 320,
    cropHeight: 320,
    scale: 1,
    locationX: 10,
    locationY: 10,
    locationZ: 0
};
const lastRequest = () => JSON.parse(mocks.send.mock.lastCall[0].getMessageArray()[0]);

afterEach(() => {
    cancelTrustedCameraRequests();
    mocks.send.mockClear();
    vi.useRealTimers();
});

describe('trusted camera request boundary', () => {
    it('captures the current room canvas before any room mouse selection', () => {
        const canvas = { width: 1280, height: 900, screenOffsetX: 0, screenOffsetY: 0, isFlipped: false, scale: 1,
            geometry: { scale: 64, location: { x: 10, y: 10, z: 0 } } };
        const getCanvas = vi.fn(() => canvas);
        vi.mocked(GetRoomEngine).mockReturnValue({ getRoomInstanceRenderingCanvas: getCanvas } as never);
        vi.mocked(GetRoomSessionManager).mockReturnValue({ getSession: () => ({ roomId: 12 }) } as never);
        vi.mocked(GetRenderer).mockReturnValue({} as never);
        expect(getTrustedCameraViewport({ x: 400, y: 200, width: 320, height: 320 } as never)).toEqual(viewport);
        expect(getCanvas).toHaveBeenCalledWith(12, 1);
    });

    it('sends the viewpoint as one string and completes only its matching capture', async () => {
        const first = captureTrustedCamera(viewport);
        const firstRequest = lastRequest();
        const second = captureTrustedCamera(viewport);
        const secondRequest = lastRequest();

        expect(firstRequest).toEqual({ v: 1, action: 'capture', requestId: expect.any(String), viewport });
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toHaveLength(1);
        completeTrustedCameraRequest(JSON.stringify({ v: 1, requestId: secondRequest.requestId, draftId, url, stage: 'capture' }));
        expect((await second).url).toBe(url);
        completeTrustedCameraRequest(JSON.stringify({ v: 1, requestId: firstRequest.requestId, draftId, url, stage: 'capture' }));
        expect((await first).requestId).toBe(firstRequest.requestId);
    });

    it('rejects external and embedded media returned as a camera image', async () => {
        for (const badUrl of ['https://example.com/image.png', 'data:image/png;base64,AAAA', '//example.com/x.png', '/camera/../../image.png']) {
            const result = renderTrustedCamera(draftId, [{ name: 'sepia', strength: 0.5 }], false);
            const rejected = expect(result).rejects.toThrow('Camera rendering failed');
            completeTrustedCameraRequest(JSON.stringify({ v: 1, requestId: lastRequest().requestId, draftId, url: badUrl, stage: 'render' }));
            await rejected;
        }
    });

    it('ignores a timed-out response instead of attaching it to the next capture', async () => {
        vi.useFakeTimers();
        const first = captureTrustedCamera(viewport);
        const oldId = lastRequest().requestId;
        const rejected = expect(first).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(30_000);
        await rejected;

        const next = captureTrustedCamera(viewport);
        const nextId = lastRequest().requestId;
        completeTrustedCameraRequest(JSON.stringify({ v: 1, requestId: oldId, draftId, url, stage: 'capture' }));
        completeTrustedCameraRequest(JSON.stringify({ v: 1, requestId: nextId, draftId, url, stage: 'capture' }));
        expect((await next).requestId).toBe(nextId);
    });
});
