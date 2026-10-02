import { GetRenderer, OctaneRectangle, RenderRoomMessageComposer, RenderRoomThumbnailMessageComposer, RoomGeometry } from '@octane/renderer';
import { SendMessageComposer } from '../octane/SendMessageComposer';
import { GetCameraRoomCanvas } from './GetCameraRoomCanvas';
import { getCameraMediaUrl } from './CameraMediaUrl';

export interface CameraViewport {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
    cropWidth: number;
    cropHeight: number;
    scale: number;
    locationX: number;
    locationY: number;
    locationZ: number;
}

export interface CameraEffectSelection {
    name: string;
    strength: number;
}

export interface CameraCaptureResult {
    v: 1;
    requestId: string;
    draftId: string;
    url: string;
    stage: 'capture' | 'render';
}

const REQUEST_TIMEOUT_MS = 30_000;
const pendingRequests = new Map<
    string,
    {
        stage: CameraCaptureResult['stage'];
        resolve: (value: CameraCaptureResult) => void;
        reject: (reason: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }
>();

/** The request contains only a viewpoint. The server supplies every room object and pixel. */
export const getTrustedCameraViewport = (frame: InstanceType<typeof OctaneRectangle>): CameraViewport => {
    const canvas = GetCameraRoomCanvas();
    const geometry = canvas?.geometry as RoomGeometry;
    const location = geometry?.location;
    const renderer = GetRenderer();

    if (!canvas || !location || !renderer || canvas.isFlipped || canvas.scale !== 1 || geometry.scale !== RoomGeometry.SCALE_ZOOMED_IN) {
        throw new Error('Camera requires the standard room view');
    }

    return {
        width: canvas.width,
        height: canvas.height,
        offsetX: canvas.screenOffsetX,
        offsetY: canvas.screenOffsetY,
        x: frame.x,
        y: frame.y,
        cropWidth: frame.width,
        cropHeight: frame.height,
        scale: 1,
        locationX: location.x,
        locationY: location.y,
        locationZ: location.z
    };
};

export const sendTrustedCameraRequest = (request: object, thumbnail = false): void => {
    const composer = thumbnail ? new RenderRoomThumbnailMessageComposer() : new RenderRoomMessageComposer();

    // Use the registered camera packet class and its normal string codec.
    composer.getMessageArray().push(JSON.stringify(request));
    SendMessageComposer(composer);
};

const requestCamera = (stage: CameraCaptureResult['stage'], fields: object): Promise<CameraCaptureResult> => {
    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error('Camera request timed out'));
        }, REQUEST_TIMEOUT_MS);

        pendingRequests.set(requestId, { stage, resolve, reject, timer });
        try {
            sendTrustedCameraRequest({ v: 1, action: stage, requestId, ...fields });
        } catch (error) {
            clearTimeout(timer);
            pendingRequests.delete(requestId);
            reject(error instanceof Error ? error : new Error('Camera request failed'));
        }
    });
};

export const captureTrustedCamera = (viewport: CameraViewport): Promise<CameraCaptureResult> => requestCamera('capture', { viewport });

export const renderTrustedCamera = (draftId: string, effects: CameraEffectSelection[], zoom: boolean): Promise<CameraCaptureResult> =>
    requestCamera('render', { draftId, effects, zoom });

export const deleteTrustedCamera = (draftId: string): void => {
    if (draftId) sendTrustedCameraRequest({ v: 1, action: 'delete', draftId });
};

export const completeTrustedCameraRequest = (payload: string): void => {
    let result: CameraCaptureResult;

    try {
        result = JSON.parse(payload);
    } catch {
        // An empty result is the server's rejection of a malformed packet.
        cancelTrustedCameraRequests();
        return;
    }

    const pending = pendingRequests.get(result?.requestId);

    if (!pending) return;

    clearTimeout(pending.timer);
    pendingRequests.delete(result.requestId);
    if (
        result.v !== 1 ||
        result.stage !== pending.stage ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result.draftId ?? '') ||
        typeof result.url !== 'string' ||
        !getCameraMediaUrl(result.url)
    ) {
        pending.reject(new Error('Camera rendering failed'));
        return;
    }

    pending.resolve(result);
};

export const cancelTrustedCameraRequests = (): void => {
    for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Camera session ended'));
    }
    pendingRequests.clear();
};
