import { CreateLinkEvent, GetRenderer, OctaneTexture } from '@octane/renderer';
import { FC, useEffect, useRef } from 'react';
import {
    blitRoomCanvasToViewfinder,
    CameraPicture,
    captureTrustedCamera,
    deleteTrustedCamera,
    getTrustedCameraViewport,
    getViewfinderRoomFrame,
    LocalizeText,
    NotificationAlertType,
    PlaySound,
    SoundNames,
    snapshotViewfinder
} from '../../../api';
import { Column, DraggableWindow } from '../../../common';
import { useCamera, useNotification } from '../../../hooks';
import { getNextEmptyCameraSlot, willFillLastCameraSlot } from '../CameraAirUtilities';
import { CameraCenteredText } from './CameraNativeText';

export interface CameraWidgetCaptureViewProps {
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const CAMERA_ROLL_LIMIT: number = 5;
const AIR_FALLBACK_FRAME_INTERVAL: number = 100;
const ROOM_STREAM_FRAME_RATE: number = 60;
let hasShownFullRollAlert: boolean = false;

export const CameraWidgetCaptureView: FC<CameraWidgetCaptureViewProps> = (props) => {
    const { onClose = null, onEdit = null, onDelete = null } = props;
    const {
        cameraRoll = Array(CAMERA_ROLL_LIMIT).fill(null),
        cameraRollRef = null,
        setCameraRoll = null,
        selectedPictureIndex = -1,
        setSelectedPictureIndex = null,
        activePictureSlotIndex = 0,
        setActivePictureSlotIndex = null
    } = useCamera();
    const { simpleAlert = null } = useNotification();
    const elementRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);
    const isTakingPictureRef = useRef(false);
    const isMountedRef = useRef(true);
    const pendingCapturedSlotRef = useRef(-1);
    const pendingShouldShowFullAlertRef = useRef(false);

    const selectedPicture = selectedPictureIndex > -1 ? cameraRoll[selectedPictureIndex] : null;

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (selectedPicture) return;

        const target = elementRef.current;
        const video = videoRef.current;
        const source = GetRenderer()?.canvas;

        if (!target || !video || !source) return;

        let frame = 0;
        let stream: MediaStream = null;
        let streamIsReady = false;
        let previousPosition = '';

        const markStreamReady = () => {
            streamIsReady = true;
            video.classList.add('octane-camera-viewfinder__stream--ready');
        };

        const markStreamUnavailable = () => {
            streamIsReady = false;
            video.classList.remove('octane-camera-viewfinder__stream--ready');
        };

        try {
            if (typeof source.captureStream === 'function') {
                stream = source.captureStream(ROOM_STREAM_FRAME_RATE);
                video.srcObject = stream;
                video.addEventListener('playing', markStreamReady);
                video.addEventListener('error', markStreamUnavailable);
                void video.play().catch(markStreamUnavailable);
            }
        } catch {
            stream = null;
        }

        const tick = (now: number) => {
            const sourceBounds = source.getBoundingClientRect();
            const targetBounds = target.getBoundingClientRect();

            if (sourceBounds.width > 0 && sourceBounds.height > 0 && targetBounds.width > 0 && targetBounds.height > 0) {
                const position = `${sourceBounds.left - targetBounds.left},${sourceBounds.top - targetBounds.top},${sourceBounds.width},${sourceBounds.height}`;

                if (position !== previousPosition) {
                    previousPosition = position;
                    video.style.width = `${sourceBounds.width}px`;
                    video.style.height = `${sourceBounds.height}px`;
                    video.style.transform = `translate3d(${sourceBounds.left - targetBounds.left}px, ${sourceBounds.top - targetBounds.top}px, 0)`;
                }
            }

            // AIR registers CameraViewFinder as a 100 ms update receiver. Keep
            // that cadence only for browsers where canvas.captureStream is not
            // available; the normal path stays entirely in the compositor.
            if (!streamIsReady) {
                blitRoomCanvasToViewfinder(target, 320, 320, AIR_FALLBACK_FRAME_INTERVAL, now);
            }

            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(frame);
            video.removeEventListener('playing', markStreamReady);
            video.removeEventListener('error', markStreamUnavailable);
            video.pause();
            video.srcObject = null;
            video.classList.remove('octane-camera-viewfinder__stream--ready');
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [selectedPicture]);

    useEffect(() => {
        const capturedSlot = pendingCapturedSlotRef.current;

        if (capturedSlot < 0) return;

        pendingCapturedSlotRef.current = -1;

        const nextEmptySlot = getNextEmptyCameraSlot(cameraRoll);

        if (nextEmptySlot >= 0) {
            setActivePictureSlotIndex(nextEmptySlot);
            pendingShouldShowFullAlertRef.current = false;
            return;
        }

        setActivePictureSlotIndex(capturedSlot);

        if (pendingShouldShowFullAlertRef.current && !hasShownFullRollAlert) {
            hasShownFullRollAlert = true;
            simpleAlert(LocalizeText('camera.full.body'), NotificationAlertType.WINDOW, null, null, LocalizeText('camera.full.header'));
        }

        pendingShouldShowFullAlertRef.current = false;
    }, [cameraRoll, setActivePictureSlotIndex, simpleAlert]);

    const takePicture = async () => {
        if (selectedPictureIndex > -1) {
            setSelectedPictureIndex(-1);
            return;
        }

        if (isTakingPictureRef.current) return;

        const frame = getViewfinderRoomFrame(elementRef.current, 320, 320);

        if (!frame) {
            simpleAlert(LocalizeText('camera.alert.too_much_stuff'), NotificationAlertType.WINDOW, null, null, LocalizeText('generic.alert.title'));
            return;
        }

        isTakingPictureRef.current = true;

        const targetSlot = activePictureSlotIndex >= 0 && activePictureSlotIndex < CAMERA_ROLL_LIMIT ? activePictureSlotIndex : 0;
        let texture: OctaneTexture = null;
        let capturedDraftId: string = null;
        let preview: CameraPicture = null;
        let isSettled = false;

        const setSlot = (picture: CameraPicture | null) => {
            const nextRoll = Array.from({ length: CAMERA_ROLL_LIMIT }, (_, index) => (index === targetSlot ? picture : (cameraRollRef.current[index] ?? null)));

            cameraRollRef.current = nextRoll;
            setCameraRoll(nextRoll);
        };

        // Fills the empty slot and lets the roll move on to the next one, as AIR does.
        const fillSlot = (picture: CameraPicture) => {
            pendingCapturedSlotRef.current = targetSlot;
            pendingShouldShowFullAlertRef.current = !hasShownFullRollAlert && willFillLastCameraSlot(cameraRollRef.current, targetSlot);
            setSlot(picture);
        };

        try {
            PlaySound(SoundNames.CAMERA_SHUTTER);
            flashRef.current?.classList.remove('octane-camera-capture__flash--active');
            // Restart the CSS flash even when two photographs are taken quickly.
            void flashRef.current?.offsetWidth;
            flashRef.current?.classList.add('octane-camera-capture__flash--active');

            const viewport = getTrustedCameraViewport(frame);
            const previousPicture = cameraRollRef.current[targetSlot];

            // Free the replaced draft first so a full roll stays within the server's draft limit.
            if (previousPicture) {
                deleteTrustedCamera(previousPicture.draftId);
                previousPicture.texture?.destroy?.(true);
                setSlot(null);
            }

            const pendingCapture = captureTrustedCamera(viewport);

            pendingCapture.catch(() => {});

            // The trusted capture is still the only photograph that can be edited or
            // bought. Until it arrives the slot shows the user's own view of the frame.
            const streamIsReady = videoRef.current?.classList.contains('octane-camera-viewfinder__stream--ready');

            void snapshotViewfinder(elementRef.current, streamIsReady ? videoRef.current : null, 320, 320).then((previewUrl) => {
                if (!previewUrl || isSettled || cameraRollRef.current[targetSlot]) return;

                preview = new CameraPicture(null, previewUrl);
                fillSlot(preview);
            });

            const capture = await pendingCapture;
            capturedDraftId = capture.draftId;

            const image = new Image();
            image.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                const timeout = window.setTimeout(() => reject(new Error('Camera image timed out')), 30_000);
                image.onload = () => {
                    window.clearTimeout(timeout);
                    resolve();
                };
                image.onerror = () => {
                    window.clearTimeout(timeout);
                    reject(new Error('Camera image could not be loaded'));
                };
                image.src = capture.url;
            });

            isSettled = true;

            // The slot was deleted, reused or cleared with the room session meanwhile.
            if (cameraRollRef.current[targetSlot] !== preview || (!preview && !isMountedRef.current)) {
                deleteTrustedCamera(capture.draftId);
                return;
            }

            texture = OctaneTexture.from(image);

            const picture = new CameraPicture(texture, capture.url, capture.draftId);

            texture = null;
            capturedDraftId = null;

            if (preview) setSlot(picture);
            else fillSlot(picture);
        } catch {
            isSettled = true;

            if (capturedDraftId) deleteTrustedCamera(capturedDraftId);
            texture?.destroy?.(true);

            if (preview && cameraRollRef.current[targetSlot] === preview) {
                setSlot(null);
                setActivePictureSlotIndex(targetSlot);
            }

            if (isMountedRef.current) {
                simpleAlert(LocalizeText('camera.alert.too_much_stuff'), NotificationAlertType.WINDOW, null, null, LocalizeText('generic.alert.title'));
            }
        } finally {
            isTakingPictureRef.current = false;
        }
    };

    const activeSlotIndex = selectedPictureIndex > -1 ? selectedPictureIndex : activePictureSlotIndex;
    const hasPictures = cameraRoll.some((picture) => !!picture);

    return (
        <DraggableWindow>
            <Column center className="octane-camera-capture" gap={0}>
                <div className="octane-camera-capture__body drag-handler">
                    <div className="octane-camera-capture__title">
                        <CameraCenteredText
                            background={0x000000}
                            color={0xffffff}
                            text={LocalizeText('camera.interface.title')}
                            textStyle="u_frame_title"
                            width={340}
                        />
                    </div>
                    <button type="button" className="octane-camera-capture__help" aria-label={LocalizeText('generic.help')} onClick={() => CreateLinkEvent('habbopages/camera')} />
                    <button type="button" className="octane-camera-capture__close" aria-label={LocalizeText('generic.close')} onClick={onClose} />
                    <div className="octane-camera-viewfinder">
                        {!selectedPicture && (
                            <>
                                <canvas ref={elementRef} className="octane-camera-viewfinder__fallback" width={320} height={320} />
                                <video ref={videoRef} className="octane-camera-viewfinder__stream" aria-hidden="true" muted playsInline />
                            </>
                        )}
                        {selectedPicture && <img alt="" className="octane-camera-viewfinder__photo" src={selectedPicture.imageUrl} />}
                    </div>
                    {!selectedPicture && <div className="octane-camera-capture__crosshair" aria-hidden="true" />}
                    <div ref={flashRef} className="octane-camera-capture__flash" aria-hidden="true" />
                    {selectedPicture?.draftId && (
                        <div className="octane-camera-capture__preview-actions">
                            <button
                                className="habbo-btn-primary octane-camera-capture__editor-button"
                                title={LocalizeText('camera.editor.button.tooltip')}
                                type="button"
                                onClick={onEdit}
                            >
                                <CameraCenteredText
                                    background={0x000000}
                                    color={0xffffff}
                                    style={{ mixBlendMode: 'screen' }}
                                    text={LocalizeText('camera.editor.button.text')}
                                    textStyle="button_shiny_bold"
                                    width={38}
                                />
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        className="octane-camera-capture__shutter"
                        aria-label={LocalizeText('camera.take.photo.button.tooltip')}
                        title={LocalizeText('camera.take.photo.button.tooltip')}
                        onClick={takePicture}
                    />
                </div>
                <div className={`octane-camera-roll${hasPictures ? '' : ' octane-camera-roll--hidden'}`} aria-hidden={!hasPictures}>
                    {Array.from({ length: CAMERA_ROLL_LIMIT }, (_, index) => {
                        const picture = cameraRoll[index];
                        const isActive = index === activeSlotIndex;

                        return (
                            <div key={index} className={`octane-camera-roll__slot${isActive ? ' octane-camera-roll__slot--active' : ''}`}>
                                <button
                                    type="button"
                                    className="octane-camera-roll__slot-button"
                                    aria-label={picture ? LocalizeText('camera.editor.button.tooltip') : LocalizeText('camera.take.photo.button.tooltip')}
                                    onClick={() => {
                                        if (isTakingPictureRef.current) return;

                                        setActivePictureSlotIndex(index);
                                        setSelectedPictureIndex(picture ? index : -1);
                                    }}
                                >
                                    {picture && <img alt="" src={picture.imageUrl} />}
                                </button>
                                {picture && selectedPictureIndex === index && (
                                    <button
                                        type="button"
                                        className="octane-camera-roll__delete"
                                        aria-label={LocalizeText('camera.delete.button.text')}
                                        title={LocalizeText('camera.delete.button.text')}
                                        onClick={() => {
                                            if (!isTakingPictureRef.current) onDelete();
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </Column>
        </DraggableWindow>
    );
};
