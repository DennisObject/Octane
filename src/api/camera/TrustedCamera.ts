import { GetRenderer, VoltRectangle, RenderRoomMessageComposer, RenderRoomThumbnailMessageComposer, RoomGeometry } from '@volt/renderer';
import { SendMessageComposer } from '../volt/SendMessageComposer';
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
    png?: ArrayBuffer;
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

// The server and renderer reject room canvases above this size on either axis.
const MAX_VIEWPORT_SIZE = 2048;

/**
 * Room content sits at trunc(size / 2) + floor(offset) on a canvas, so a window
 * wider or taller than the renderer allows is sent as a smaller canvas with the
 * crop and offset shifted by whole pixels. The photographed region is unchanged.
 */
const fitViewportAxis = (size: number, offset: number, crop: number, cropSize: number): { size: number; offset: number; crop: number } => {
    if (size <= MAX_VIEWPORT_SIZE) return { size, offset, crop };

    const fittedCrop = Math.min(Math.max(crop, 0), MAX_VIEWPORT_SIZE - cropSize);

    return {
        size: MAX_VIEWPORT_SIZE,
        offset: offset + (fittedCrop - crop) + Math.trunc(size / 2) - Math.trunc(MAX_VIEWPORT_SIZE / 2),
        crop: fittedCrop
    };
};

/** The request contains only a viewpoint. The server supplies every room object and pixel. */
export const getTrustedCameraViewport = (frame: InstanceType<typeof VoltRectangle>): CameraViewport => {
    const canvas = GetCameraRoomCanvas();
    const geometry = canvas?.geometry as RoomGeometry;
    const location = geometry?.location;
    const renderer = GetRenderer();

    if (!canvas || !location || !renderer || canvas.isFlipped || canvas.scale !== 1 || geometry.scale !== RoomGeometry.SCALE_ZOOMED_IN) {
        throw new Error('Camera requires the standard room view');
    }

    const horizontal = fitViewportAxis(canvas.width, canvas.screenOffsetX, frame.x, frame.width);
    const vertical = fitViewportAxis(canvas.height, canvas.screenOffsetY, frame.y, frame.height);

    return {
        width: horizontal.size,
        height: vertical.size,
        offsetX: horizontal.offset,
        offsetY: vertical.offset,
        x: horizontal.crop,
        y: vertical.crop,
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

export const completeTrustedCameraRequest = (payload: string, png?: ArrayBuffer): void => {
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

    pending.resolve({ ...result, png });
};

const getTrustedCameraImageSource = (capture: CameraCaptureResult): Promise<string> => {
    if (!capture.png) return Promise.resolve(capture.url);

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : capture.url);
        reader.onerror = () => resolve(capture.url);
        reader.onabort = () => resolve(capture.url);
        reader.readAsDataURL(new Blob([capture.png], { type: 'image/png' }));
    });
};

export const cancelTrustedCameraRequests = (): void => {
    for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Camera session ended'));
    }
    pendingRequests.clear();
};

export const loadTrustedCameraImage = async (capture: CameraCaptureResult): Promise<HTMLImageElement> => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const imageSource = await getTrustedCameraImageSource(capture);
    await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Camera image timed out')), 30_000);
        let loadingInline = imageSource !== capture.url;
        const failed = () => {
            if (loadingInline) {
                loadingInline = false;
                image.src = capture.url;
                return;
            }

            window.clearTimeout(timeout);
            reject(new Error('Camera image could not be loaded'));
        };
        image.onload = () => {
            if (image.naturalWidth !== 320 || image.naturalHeight !== 320) {
                failed();
                return;
            }

            window.clearTimeout(timeout);
            resolve();
        };
        image.onerror = failed;
        image.src = imageSource;
    });

    return image;
};
