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

export class ChatBubbleUtilities {
    private static MAX_CACHE_SIZE: number = 200;

    public static AVATAR_COLOR_CACHE: Map<string, number> = new Map();
    public static AVATAR_IMAGE_CACHE: Map<string, string> = new Map();
    public static PET_IMAGE_CACHE: Map<string, string> = new Map();
    private static PET_IMAGE_PENDING_CACHE: Map<string, Promise<string>> = new Map();

    private static placeHolderImageUrl: string = '';

    private static pruneCache<T>(cache: Map<string, T>, maxSize: number = ChatBubbleUtilities.MAX_CACHE_SIZE): void {
        if (cache.size <= maxSize) return;

        const deleteCount = cache.size - maxSize;
        const iterator = cache.keys();

        for (let i = 0; i < deleteCount; i++) {
            cache.delete(iterator.next().value as string);
        }
    }

    public static async setFigureImage(figure: string): Promise<string> {
        const avatarImage = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, null, {
            resetFigure: (figure) => this.setFigureImage(figure),
            dispose: () => {},
            disposed: false
        });

        if (!avatarImage) return null;

        const isPlaceholder = avatarImage.isPlaceholder();

        if (isPlaceholder && this.placeHolderImageUrl?.length) {
            avatarImage.dispose();
            return this.placeHolderImageUrl;
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
        const bounds = this.getOpaqueBounds(source) ?? { x: 0, y: 0, width: source.width, height: source.height };
        const scale = 0.5;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bounds.width * scale));
        canvas.height = Math.max(1, Math.round(bounds.height * scale));
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/png');
        if (isPlaceholder) this.placeHolderImageUrl = imageUrl;

        this.AVATAR_IMAGE_CACHE.set(figure, imageUrl);

        this.pruneCache(this.AVATAR_IMAGE_CACHE);

        return imageUrl;
    }

    private static getOpaqueBounds(image: HTMLImageElement): { x: number; y: number; width: number; height: number } | null {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext('2d');

        if (!context || !canvas.width || !canvas.height) return null;

        context.drawImage(image, 0, 0);

        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (!data[((y * canvas.width) + x) * 4 + 3]) continue;

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }

        return (maxX < 0) ? null : { x: minX, y: minY, width: (maxX - minX + 1), height: (maxY - minY + 1) };
    }

    public static async getUserImage(figure: string): Promise<string> {
        let existing = this.AVATAR_IMAGE_CACHE.get(figure);

        if (!existing) existing = await this.setFigureImage(figure);

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

            const imageResult = GetRoomEngine().getRoomObjectPetImage(
                typeId,
                figureData.paletteId,
                figureData.color,
                new Vector3d(direction * 45),
                scale,
                {
                    imageReady: async (result) => listenerResolve(await getImageUrl(result)),
                    imageFailed: () => listenerResolve(null)
                },
                false,
                0,
                figureData.customParts,
                posture
            );

            let resolvedImage: string = null;

            if (imageResult?.id > 0) {
                resolvedImage = await Promise.race([listenerPromise, new Promise<string>((resolve) => setTimeout(() => resolve(null), 2500))]);
            }

            if (!resolvedImage) resolvedImage = await getImageUrl(imageResult);

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
}
