import { SellablePetPaletteData } from '@volt/renderer';

export class CatalogPetPalette {
    constructor(
        public readonly breed: string,
        public readonly palettes: SellablePetPaletteData[]
    ) {}
}
