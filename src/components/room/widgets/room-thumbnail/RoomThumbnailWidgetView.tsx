import { GetGuestRoomMessageComposer, ThumbnailStatusMessageEvent } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { CameraViewport, LocalizeText, RefreshRoomThumbnail, SendMessageComposer, sendTrustedCameraRequest } from '../../../../api';
import { LayoutMiniCameraView } from '../../../../common';
import { RoomWidgetThumbnailEvent } from '../../../../events';
import { useMessageEvent, useNotification, useRoom, useUiEvent } from '../../../../hooks';

const THUMBNAIL_UPLOAD_TIMEOUT_MS = 30_000;

export const RoomThumbnailWidgetView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotification();

    const clearUploadTimeout = useCallback(() => {
        if (!uploadTimeoutRef.current) return;

        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
    }, []);

    useEffect(() => clearUploadTimeout, [clearUploadTimeout]);

    useEffect(() => {
        clearUploadTimeout();
        setIsSaving(false);
        setIsVisible(false);
    }, [roomSession?.roomId, clearUploadTimeout]);

    useUiEvent([RoomWidgetThumbnailEvent.SHOW_THUMBNAIL, RoomWidgetThumbnailEvent.HIDE_THUMBNAIL, RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL], (event) => {
        switch (event.type) {
            case RoomWidgetThumbnailEvent.SHOW_THUMBNAIL:
                clearUploadTimeout();
                setIsSaving(false);
                setIsVisible(true);
                return;
            case RoomWidgetThumbnailEvent.HIDE_THUMBNAIL:
                if (isSaving) return;
                setIsVisible(false);
                return;
            case RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL:
                if (isSaving) return;
                setIsVisible((value) => !value);
                return;
        }
    });

    const receiveViewport = async (viewport: CameraViewport) => {
        if (isSaving) return;

        setIsSaving(true);
        clearUploadTimeout();
        uploadTimeoutRef.current = setTimeout(() => {
            uploadTimeoutRef.current = null;
            setIsSaving(false);
            simpleAlert(LocalizeText('camera.error.creation'));
        }, THUMBNAIL_UPLOAD_TIMEOUT_MS);

        try {
            sendTrustedCameraRequest({ v: 1, action: 'capture', requestId: crypto.randomUUID(), viewport }, true);
        } catch {
            clearUploadTimeout();
            setIsSaving(false);
            simpleAlert(LocalizeText('camera.error.creation'));
        }
    };

    useMessageEvent<ThumbnailStatusMessageEvent>(ThumbnailStatusMessageEvent, (event) => {
        if (!isSaving) return;

        clearUploadTimeout();
        const parser = event.getParser();

        if (!parser.ok) {
            setIsSaving(false);
            simpleAlert(LocalizeText(parser.isRenderLimitHit ? 'camera.render.count.info' : 'camera.error.creation'));
            return;
        }

        const roomId = roomSession?.roomId ?? -1;

        setIsSaving(false);
        setIsVisible(false);

        if (roomId > 0) {
            RefreshRoomThumbnail(roomId);
            SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
        }

        simpleAlert(LocalizeText('navigator.thumbnail.camera.success'));
    });

    if (!isVisible || !roomSession) return null;

    return (
        <LayoutMiniCameraView
            roomId={roomSession.roomId}
            viewportReceiver={receiveViewport}
            isSaving={isSaving}
            onCaptureError={() => simpleAlert(LocalizeText('camera.error.creation'))}
            onClose={() => !isSaving && setIsVisible(false)}
        />
    );
};
