import {
    CameraStorageUrlMessageEvent,
    GetRoomCameraWidgetManager,
    InitCameraMessageEvent,
    IRoomCameraWidgetEffect,
    RequestCameraConfigurationComposer,
    RoomCameraWidgetManagerEvent,
    RoomSessionEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { CameraPicture, cancelTrustedCameraRequests, completeTrustedCameraRequest, SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';

const useCameraState = () => {
    const [availableEffects, setAvailableEffects] = useState<IRoomCameraWidgetEffect[]>([]);
    // AIR keeps five stable slots for the lifetime of the camera. Empty slots
    // must remain addressable so a deleted photograph does not shift the
    // photographs to its right and the user can choose where the next shot goes.
    const [cameraRoll, setCameraRoll] = useState<Array<CameraPicture | null>>(() => Array(5).fill(null));
    // A capture that finishes after the camera window closed still needs the current roll.
    const cameraRollRef = useRef(cameraRoll);
    const [selectedPictureIndex, setSelectedPictureIndex] = useState(-1);
    const [activePictureSlotIndex, setActivePictureSlotIndex] = useState(0);
    const [price, setPrice] = useState<{ credits: number; duckets: number; publishDucketPrice: number }>(null);

    useOctaneEvent<RoomCameraWidgetManagerEvent>(RoomCameraWidgetManagerEvent.INITIALIZED, (event) => {
        setAvailableEffects(Array.from(GetRoomCameraWidgetManager().effects.values()));
    });

    useMessageEvent<CameraStorageUrlMessageEvent>(CameraStorageUrlMessageEvent, (event) => {
        completeTrustedCameraRequest(event.getParser().url);
    });

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => {
        cancelTrustedCameraRequests();
        setCameraRoll((previous) => {
            previous.forEach((picture) => picture?.texture?.destroy?.(true));
            return Array(5).fill(null);
        });
        setSelectedPictureIndex(-1);
        setActivePictureSlotIndex(0);
    });

    useMessageEvent<InitCameraMessageEvent>(InitCameraMessageEvent, (event) => {
        const parser = event.getParser();

        setPrice({ credits: parser.creditPrice, duckets: parser.ducketPrice, publishDucketPrice: parser.publishDucketPrice });
    });

    useEffect(() => {
        cameraRollRef.current = cameraRoll;
    }, [cameraRoll]);

    useEffect(() => {
        const manager = GetRoomCameraWidgetManager();

        if (!manager.isLoaded) manager.init();
        else setAvailableEffects(Array.from(manager.effects.values()));

        SendMessageComposer(new RequestCameraConfigurationComposer());
        return cancelTrustedCameraRequests;
    }, []);

    return {
        availableEffects,
        cameraRoll,
        cameraRollRef,
        setCameraRoll,
        selectedPictureIndex,
        setSelectedPictureIndex,
        activePictureSlotIndex,
        setActivePictureSlotIndex,
        price
    };
};

export const useCamera = () => useSharedHook(useCameraState);

registerSharedHook(useCameraState);
