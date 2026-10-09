import { OctaneTexture } from '@octane/renderer';

export class CameraPicture {
    constructor(
        public texture: OctaneTexture,
        public imageUrl: string,
        public draftId: string = null,
        public displayUrl: string = imageUrl
    ) {}
}
