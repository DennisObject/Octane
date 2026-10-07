import {
    AvatarFigurePartType,
    AvatarScaleType,
    AvatarSetType,
    GetAvatarRenderManager,
    GetRoomEngine,
    PetFigureData,
    TextureUtils,
    Vector3d
} from '@octane/renderer';
import { GetConfigurationValue } from '../../octane/GetConfigurationValue';

export class ChatBubbleUtilities {
    private static MAX_CACHE_SIZE: number = 200;

    public static AVATAR_COLOR_CACHE: Map<string, number> = new Map();
    public static AVATAR_IMAGE_CACHE: Map<string, string> = new Map();
    public static PET_IMAGE_CACHE: Map<string, string> = new Map();
    private static PET_IMAGE_PENDING_CACHE: Map<string, Promise<string>> = new Map();

    private static PLACEHOLDER_IMAGE_CACHE: Map<boolean, string> = new Map();

    private static pruneCache<T>(cache: Map<string, T>, maxSize: number = ChatBubbleUtilities.MAX_CACHE_SIZE): void {
        if (cache.size <= maxSize) return;

        const deleteCount = cache.size - maxSize;
        const iterator = cache.keys();

        for (let i = 0; i < deleteCount; i++) {
            cache.delete(iterator.next().value as string);
        }
    }

    public static async setFigureImage(figure: string, zoom: boolean = GetConfigurationValue<boolean>('zoom.enabled', false)): Promise<string> {
        const avatarImage = GetAvatarRenderManager().createAvatarImage(figure, zoom ? AvatarScaleType.LARGE : AvatarScaleType.SMALL, null, {
            resetFigure: (figure) => this.setFigureImage(figure, zoom),
            dispose: () => {},
            disposed: false
        });

        if (!avatarImage) return null;

        const isPlaceholder = avatarImage.isPlaceholder();

        const placeholderImageUrl = this.PLACEHOLDER_IMAGE_CACHE.get(zoom);

        if (isPlaceholder && placeholderImageUrl?.length) {
            avatarImage.dispose();
            return placeholderImageUrl;
        }

        figure = avatarImage.getFigure().getFigureString();

        avatarImage.setDirection(AvatarSetType.HEAD, 2);
        const sourceUrl = avatarImage.processAsImageUrl(AvatarSetType.HEAD);
        const color = avatarImage.getPartColor(AvatarFigurePartType.CHEST);
        this.AVATAR_COLOR_CACHE.set(figure, (color && color.rgb) || 16777215);
        this.pruneCache(this.AVATAR_COLOR_CACHE);
        avatarImage.dispose();
        const source = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = sourceUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        if (zoom) {
            const scaled = document.createElement('canvas');
            scaled.width = Math.round(source.width / 2);
            scaled.height = Math.round(source.height / 2);
            const scaledContext = scaled.getContext('2d');
            scaledContext.imageSmoothingEnabled = true;
            scaledContext.drawImage(source, 0, 0, scaled.width, scaled.height);
            canvas.width = 25;
            canvas.height = 25;
            context.imageSmoothingEnabled = false;
            context.drawImage(scaled, 10, 14, 25, 25, 0, 0, 25, 25);
        } else context.drawImage(source, 21, 28, 50, 50, 0, 0, 50, 50);
        const imageUrl = canvas.toDataURL('image/png');
        if (isPlaceholder) this.PLACEHOLDER_IMAGE_CACHE.set(zoom, imageUrl);

        this.AVATAR_IMAGE_CACHE.set(this.getAvatarImageCacheKey(figure, zoom), imageUrl);

        this.pruneCache(this.AVATAR_IMAGE_CACHE);

        return imageUrl;
    }

    public static async getUserImage(figure: string): Promise<string> {
        const zoom = GetConfigurationValue<boolean>('zoom.enabled', false);
        let existing = this.AVATAR_IMAGE_CACHE.get(this.getAvatarImageCacheKey(figure, zoom));

        if (!existing) existing = await this.setFigureImage(figure, zoom);

        return existing;
    }

    public static async getPetImage(figure: string, direction: number, _arg_3: boolean, scale: number = 64, posture: string = null) {
        const cacheKey = `${figure}-${posture || 'std'}-${direction}-${scale}`;
        let existing = this.PET_IMAGE_CACHE.get(cacheKey);

        if (existing) return existing;

        const pending = this.PET_IMAGE_PENDING_CACHE.get(cacheKey);

        if (pending) return pending;

        const resultPromise = (async () => {
            const figureData = new PetFigureData(figure);
            const typeId = figureData.typeId;

            const getImageUrl = async (imageResult) => {
                if (!imageResult) return null;

                const image = await imageResult.getImage();

                if (image) return image.src;
                if (imageResult.data) return TextureUtils.generateImageUrl(imageResult.data);

                return null;
            };

            let listenerResolve = null;

            const listenerPromise = new Promise<string>((resolve) => {
                listenerResolve = resolve;
            });

            // Pet bundles only carry 64 sprites, so a smaller scale is rendered at 64 and shrunk afterwards.
            const imageResult = GetRoomEngine().getRoomObjectPetImage(
                typeId,
                figureData.paletteId,
                figureData.color,
                new Vector3d(direction * 45),
                64,
                {
                    imageReady: async (result) => listenerResolve(await getImageUrl(result)),
                    imageFailed: () => listenerResolve(null)
                },
                typeId === 35,
                0,
                figureData.customParts,
                posture
            );

            let resolvedImage: string = null;

            if (imageResult?.id > 0) {
                resolvedImage = await Promise.race([listenerPromise, new Promise<string>((resolve) => setTimeout(() => resolve(null), 2500))]);
            }

            if (!resolvedImage) resolvedImage = await getImageUrl(imageResult);

            if (resolvedImage && scale < 64) resolvedImage = await this.scaleImage(resolvedImage, scale / 64);

            if (resolvedImage) {
                this.PET_IMAGE_CACHE.set(cacheKey, resolvedImage);
                this.pruneCache(this.PET_IMAGE_CACHE);
            }

            return resolvedImage;
        })();

        this.PET_IMAGE_PENDING_CACHE.set(cacheKey, resultPromise);

        try {
            existing = await resultPromise;
        } finally {
            this.PET_IMAGE_PENDING_CACHE.delete(cacheKey);
        }

        return existing;
    }

    private static async scaleImage(sourceUrl: string, ratio: number): Promise<string> {
        const source = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = sourceUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * ratio));
        canvas.height = Math.max(1, Math.round(source.height * ratio));
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.drawImage(source, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    }

    private static getAvatarImageCacheKey(figure: string, zoom: boolean): string {
        return `${zoom ? 'zoom' : 'normal'}:${figure}`;
    }
}
