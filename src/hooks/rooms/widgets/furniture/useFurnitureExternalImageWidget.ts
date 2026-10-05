import { GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { useState } from 'react';
import { getCameraMediaUrl, IPhotoData } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

const useFurnitureExternalImageWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(-1);
    const [currentPhotos, setCurrentPhotos] = useState<IPhotoData[]>([]);
    const [currentObjectIds, setCurrentObjectIds] = useState<number[]>([]);
    const { roomSession = null } = useRoom();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setCurrentPhotoIndex(-1);
        setCurrentPhotos([]);
        setCurrentObjectIds([]);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_EXTERNAL_IMAGE, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const roomTotalImages = GetRoomEngine().getRoomObjects(roomSession?.roomId, RoomObjectCategory.WALL);

        if (!roomObject) return;

        const datas: IPhotoData[] = [];
        const objectIds: number[] = [];

        roomTotalImages.forEach((object) => {
            if (object.type !== 'external_image_wallitem_poster_small') return null;

            const data = object.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA);
            try {
                const jsonData: IPhotoData = JSON.parse(data);
                if (getCameraMediaUrl(jsonData?.w)) {
                    datas.push(jsonData);
                    objectIds.push(object.id);
                }
            } catch {
                // Legacy or malformed item data cannot supply camera media.
            }
        });

        setObjectId(event.objectId);
        setCategory(event.category);
        setCurrentPhotos(datas);
        setCurrentObjectIds(objectIds);

        let roomObjectPhotoData: IPhotoData;
        try {
            roomObjectPhotoData = JSON.parse(roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA)) as IPhotoData;
        } catch {
            onClose();
            return;
        }

        if (!getCameraMediaUrl(roomObjectPhotoData?.w)) {
            onClose();
            return;
        }

        setCurrentPhotoIndex(() => {
            let index = 0;

            if (roomObjectPhotoData) {
                index = datas.findIndex((data) => data.w === roomObjectPhotoData.w);
            }

            if (index < 0) index = 0;

            return index;
        });
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, currentPhotoIndex, currentPhotos, currentObjectIds, onClose };
};

export const useFurnitureExternalImageWidget = useFurnitureExternalImageWidgetState;
