import { FC, useEffect, useRef, useState } from 'react';
import { blitRoomCanvasToViewfinder, CameraViewport, getTrustedCameraViewport, getViewfinderRoomFrame, LocalizeText, PlaySound, SoundNames } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../card';

interface LayoutMiniCameraViewProps {
    roomId: number;
    viewportReceiver: (viewport: CameraViewport) => Promise<void>;
    onClose: () => void;
    isSaving?: boolean;
    onCaptureError?: () => void;
}

export const LayoutMiniCameraView: FC<LayoutMiniCameraViewProps> = (props) => {
    const { roomId = -1, viewportReceiver = null, onClose = null, isSaving = false, onCaptureError = null } = props;
    const elementRef = useRef<HTMLCanvasElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        let frame = 0;
        const tick = (now: number) => {
            blitRoomCanvasToViewfinder(elementRef.current, 110, 110, 1000 / 24, now);
            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(frame);
    }, []);

    const takePicture = async () => {
        if (isCapturing || isSaving) return;

        const frame = getViewfinderRoomFrame(elementRef.current, 110, 110);

        if (!frame) {
            onCaptureError?.();
            return;
        }

        setIsCapturing(true);
        PlaySound(SoundNames.CAMERA_SHUTTER);

        try {
            await viewportReceiver(getTrustedCameraViewport(frame));
        } catch {
            onCaptureError?.();
        } finally {
            setIsCapturing(false);
        }
    };

    const isBusy = isCapturing || isSaving;

    return (
        <OctaneCardView
            className="octane-room-thumbnail-camera"
            role="dialog"
            aria-label={LocalizeText('navigator.thumbnail.camera.title')}
            frameStyle={3}
            isResizable={false}
        >
            <OctaneCardHeaderView headerText={LocalizeText('navigator.thumbnail.camera.title')} onCloseClick={() => !isBusy && onClose()} />
            <OctaneCardContentView className="octane-room-thumbnail-camera__content" aria-busy={isBusy}>
                <div className="octane-room-thumbnail-camera__viewfinder">
                    <canvas ref={elementRef} className="octane-camera-viewfinder" width={110} height={110} />
                </div>
                <div className="octane-room-thumbnail-camera__buttons">
                    <button type="button" disabled={isBusy} onClick={onClose}>
                        {LocalizeText('navigator.thumbnail.camera.title.cancel')}
                    </button>
                    <button type="button" disabled={isBusy} onClick={takePicture}>
                        {LocalizeText('navigator.thumbnail.camera.title.capture')}
                    </button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
