import { GetRoomEngine, GetSessionDataManager, RoomControllerLevel, RoomObjectCategory } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile, getCameraMediaUrl, LocalizeText, ReportType } from '../../../../api';
import { DraggableWindow } from '../../../../common';
import { useFurnitureExternalImageWidget, useHelp, useNotification, useRoom } from '../../../../hooks';

// AIR stories_image_widget (ExternalImageWidget.drawImage): a 322px outlined photo inside a
// translucent black border, with the report/remove/close button strip on the top right.
const formatCreationDate = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';

    const date = new Date(seconds * 1000);

    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
};

export const FurnitureExternalImageView: FC<{}> = (props) => {
    const { objectId = -1, currentPhotoIndex = -1, currentPhotos = null, currentObjectIds = [], onClose = null } = useFurnitureExternalImageWidget();
    const { report = null } = useHelp();
    const { showConfirm = null } = useNotification();
    const { roomSession = null } = useRoom();
    const [index, setIndex] = useState(-1);

    useEffect(() => setIndex(currentPhotoIndex), [currentPhotoIndex]);

    if (objectId === -1 || index === -1 || !currentPhotos?.[index]) return null;

    const photo = currentPhotos[index];
    const photoObjectId = currentObjectIds[index] ?? objectId;
    const photoUrl = getCameraMediaUrl(photo.w?.replace('_small.png', '.png'));
    const creator = photo.n || photo.o || '';
    const canBrowse = currentPhotos.length > 1;
    const canRemove = (roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.ROOM_OWNER;

    const browse = (step: number) => setIndex((current) => (current + step + currentPhotos.length) % currentPhotos.length);

    const reportPhoto = () =>
        report(ReportType.PHOTO, {
            extraData: photo.w,
            roomId: photo.s,
            reportedUserId: GetSessionDataManager().userId,
            roomObjectId: photoObjectId
        });

    const removePhoto = () =>
        showConfirm(
            LocalizeText('inventory.remove.external_image_wallitem_body'),
            () => GetRoomEngine().deleteRoomObject(photoObjectId, RoomObjectCategory.WALL),
            null,
            LocalizeText('inventory.remove.external_image_wallitem_delete'),
            null,
            LocalizeText('inventory.remove.external_image_wallitem_header')
        );

    return (
        <DraggableWindow uniqueKey="photo-viewer" handleSelector=".volt-photo-viewer__panel">
            <div className="volt-photo-viewer">
                <div className="volt-photo-viewer__panel" />
                <div className="volt-photo-viewer__photo">{photoUrl && <img alt="" src={photoUrl} draggable={false} />}</div>
                {canBrowse && (
                    <>
                        <button type="button" className="volt-photo-viewer__browse volt-photo-viewer__browse--previous" onClick={() => browse(-1)} />
                        <button type="button" className="volt-photo-viewer__browse volt-photo-viewer__browse--next" onClick={() => browse(1)} />
                    </>
                )}
                {creator && (
                    <>
                        <span className="volt-photo-viewer__date">{formatCreationDate(photo.t)}</span>
                        <button type="button" className="volt-photo-viewer__creator" onClick={() => photo.oi && GetUserProfile(photo.oi)}>
                            {creator}
                        </button>
                    </>
                )}
                <div className="volt-photo-viewer__buttons">
                    <button type="button" className="volt-photo-viewer__button volt-photo-viewer__button--report" onClick={reportPhoto} />
                    {canRemove && <button type="button" className="volt-photo-viewer__button volt-photo-viewer__button--remove" onClick={removePhoto} />}
                    <button type="button" className="volt-photo-viewer__close" onClick={onClose} />
                </div>
            </div>
        </DraggableWindow>
    );
};
