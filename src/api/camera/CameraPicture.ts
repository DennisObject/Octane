import { VoltTexture } from '@volt/renderer';

export class CameraPicture {
    constructor(
        public texture: VoltTexture,
        public imageUrl: string,
        public draftId: string = null,
        public displayUrl: string = imageUrl
    ) {}
}
