import { GetAvatarRenderManager, GetRoomEngine, GetSessionDataManager, RoomObjectVariable, Vector3d } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { FurniCategory, GetProductIconUrl, Offer, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, Column, LayoutGridItem, LayoutHabbiconImageView, LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';

const PREVIEW_LIFT = 21;

// A habbicon shows above the avatar for 3 s and then fades, as in the room; the
// preview triggers it again on this cadence so it keeps playing.
const HABBICON_PREVIEW_REPEAT_MS = 4000;
// Extra lift for the habbicon preview, so the room sits higher in the view.
const HABBICON_PREVIEW_EXTRA_LIFT = 40;

// RoomPreviewer.onRoomInitialized gives the preview room floor 110 and wall 99999.
const NEUTRAL_FLOOR = '110';
const NEUTRAL_WALL = '99999';
const NEUTRAL_LANDSCAPE = 'default';

// ProductViewCatalogWidget previews floor, wallpaper and landscape on the active room's planes.
const getActiveRoomPlanes = () => {
    const roomEngine = GetRoomEngine();
    const roomId = roomEngine.activeRoomId;
    const read = (key: string, fallback: string) => roomEngine.getRoomInstanceVariable<string>(roomId, key) || fallback;

    return {
        floor: read(RoomObjectVariable.ROOM_FLOOR_TYPE, '101'),
        wall: read(RoomObjectVariable.ROOM_WALL_TYPE, '101'),
        landscape: read(RoomObjectVariable.ROOM_LANDSCAPE_TYPE, '1.1')
    };
};

export const CatalogViewProductWidgetView: FC<{ height?: number }> = (props) => {
    const { height = 240 } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { previewStuffData = null } = purchaseOptions;

    useEffect(() => {
        if (!currentOffer || currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE || !roomPreviewer) return;

        const product = currentOffer.product;

        const clearViewOffset = () => {
            roomPreviewer.addViewOffset.y = 0;
        };

        if (!product) {
            clearViewOffset();
            return;
        }

        roomPreviewer.addViewOffset.y = product.isUniqueLimitedItem ? -15 : 0;
        roomPreviewer.centerWallItems = true;
        roomPreviewer.setAutomaticStateChange(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

        let animateFurnitureState = false;
        let habbiconTimer: number = null;

        const populate = () => {
            switch (product.productType) {
                case ProductTypeEnum.FLOOR: {
                    if (!product.furnitureData) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    const furniData = GetSessionDataManager().getFloorItemData(product.furnitureData.id);
                    const isPurchasableClothing = product.furnitureData.specialType === FurniCategory.FIGURE_PURCHASABLE_SET;

                    if (isPurchasableClothing) {
                        const sessionDataManager = GetSessionDataManager();
                        const avatarRenderManager = GetAvatarRenderManager();
                        const customParams = furniData?.customParams ?? product.furnitureData.customParams ?? '';
                        const customParts = customParams
                            .split(',')
                            .map((value) => value.trim())
                            .filter((value) => /^\d+$/.test(value))
                            .map(Number);
                        const figureSets: number[] = [];

                        for (const part of customParts) {
                            if (!Number.isSafeInteger(part) || part <= 0) continue;

                            if (avatarRenderManager.isValidFigureSetForGender(part, sessionDataManager.gender)) figureSets.push(part);
                        }

                        const figureString = avatarRenderManager.getFigureStringWithFigureIds(sessionDataManager.figure, sessionDataManager.gender, figureSets);

                        roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                        roomPreviewer.addAvatarIntoRoom(figureString || sessionDataManager.figure, 0);
                        roomPreviewer.zoomIn();
                    } else {
                        roomPreviewer.reset(true);
                        roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                        roomPreviewer.addFurnitureIntoRoom(product.productClassId, new Vector3d(90), previewStuffData, product.extraParam);
                        animateFurnitureState = true;
                    }
                    return;
                }
                case ProductTypeEnum.WALL: {
                    if (!product.furnitureData) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

                    switch (product.furnitureData.specialType) {
                        case FurniCategory.FLOOR: {
                            const planes = getActiveRoomPlanes();

                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(product.extraParam, planes.wall, planes.landscape);
                            return;
                        }
                        case FurniCategory.WALL_PAPER: {
                            const planes = getActiveRoomPlanes();

                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(planes.floor, product.extraParam, planes.landscape);
                            return;
                        }
                        case FurniCategory.LANDSCAPE: {
                            const planes = getActiveRoomPlanes();

                            roomPreviewer.updateObjectRoom(planes.floor, planes.wall, product.extraParam);

                            const furniData = GetSessionDataManager().getWallItemDataByName('window_double_default');

                            if (furniData) roomPreviewer.addWallItemIntoRoom(furniData.id, new Vector3d(90), furniData.customParams);
                            else roomPreviewer.reset(false);
                            return;
                        }
                        default:
                            roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                            roomPreviewer.addWallItemIntoRoom(product.productClassId, new Vector3d(90), product.extraParam);
                            animateFurnitureState = true;
                            return;
                    }
                }
                case ProductTypeEnum.ROBOT:
                    roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                    roomPreviewer.addAvatarIntoRoom(product.extraParam, 0);
                    roomPreviewer.zoomIn();
                    return;
                case ProductTypeEnum.HABBICON: {
                    // The own avatar with the habbicon above its head, the way the room shows it.
                    roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                    roomPreviewer.addViewOffset.y = -(PREVIEW_LIFT + HABBICON_PREVIEW_EXTRA_LIFT);
                    roomPreviewer.addAvatarIntoRoom(GetSessionDataManager().figure, 0);
                    // Always the normal scale, whatever zoom an earlier preview or the zoom
                    // control left behind.
                    roomPreviewer.zoomIn();

                    let triggerSequence = 0;
                    const showHabbicon = () => {
                        const model = roomPreviewer.getRoomPreviewObject()?.model;

                        if (!model) return;

                        model.setValue(RoomObjectVariable.FIGURE_HABBICON, product.productClassId);
                        model.setValue(RoomObjectVariable.FIGURE_HABBICON_TRIGGER_SEQUENCE, ++triggerSequence);
                    };

                    showHabbicon();
                    habbiconTimer = window.setInterval(showHabbicon, HABBICON_PREVIEW_REPEAT_MS);
                    return;
                }
                case ProductTypeEnum.EFFECT:
                    roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                    roomPreviewer.addAvatarIntoRoom(GetSessionDataManager().figure, product.productClassId);
                    roomPreviewer.zoomIn();
                    return;
                default:
                    roomPreviewer.reset(false);
                    return;
            }
        };

        populate();
        roomPreviewer.setAutomaticStateChange(animateFurnitureState);

        return () => {
            if (habbiconTimer !== null) window.clearInterval(habbiconTimer);

            clearViewOffset();
        };
    }, [currentOffer, previewStuffData, roomPreviewer]);

    if (!currentOffer) return null;

    if (currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE) {
        return (
            <Column fit className="bg-muted p-2 rounded" overflow="hidden">
                <AutoGrid fullWidth className="octane-catalog-layout-bundle-grid" columnCount={4}>
                    {currentOffer.products.length > 0 &&
                        currentOffer.products.map((product, index) => {
                            const iconUrl = GetProductIconUrl(product, currentOffer);

                            return (
                                <LayoutGridItem key={index} itemCount={product.productCount}>
                                    {product.productType === ProductTypeEnum.HABBICON ? (
                                        <LayoutHabbiconImageView id={product.productClassId} />
                                    ) : (
                                        iconUrl && <img alt="" className="octane-catalog-grid-offer-icon" draggable={false} src={iconUrl} />
                                    )}
                                </LayoutGridItem>
                            );
                        })}
                </AutoGrid>
            </Column>
        );
    }

    return <LayoutRoomPreviewerView height={height} roomPreviewer={roomPreviewer} />;
};
