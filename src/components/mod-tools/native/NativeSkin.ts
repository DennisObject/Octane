// Window-manager skin (classic v75 habbo-window-manager-com): a bitmap atlas cut into entities that a layout positions with fixed / strech / move scale rules.
export interface NativeSkinEntity {
    region: { x: number; y: number; width: number; height: number };
    horizontal: 'fixed' | 'strech' | 'move';
    vertical: 'fixed' | 'strech' | 'move';
}

export interface NativeSkinLayout {
    width: number;
    height: number;
    entities: NativeSkinEntity[];
}

export interface NativeSkin {
    layouts: Record<string, NativeSkinLayout>;
}

export interface NativeSkinPiece {
    x: number;
    y: number;
    width: number;
    height: number;
    source: { x: number; y: number; width: number; height: number };
}

const rule = (value: string | null): 'fixed' | 'strech' | 'move' => (value === 'strech' || value === 'move' ? value : 'fixed');

export const parseNativeSkin = (xml: string): NativeSkin => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const layouts: Record<string, NativeSkinLayout> = {};

    for (const layout of Array.from(document.querySelectorAll('layouts > layout'))) {
        const entities: NativeSkinEntity[] = Array.from(layout.querySelectorAll('entity')).map((entity) => {
            const rectangle = entity.querySelector('region > Rectangle');
            const scale = entity.querySelector('scale');

            return {
                region: {
                    x: Number(rectangle.getAttribute('x')),
                    y: Number(rectangle.getAttribute('y')),
                    width: Number(rectangle.getAttribute('width')),
                    height: Number(rectangle.getAttribute('height'))
                },
                horizontal: rule(scale?.getAttribute('horizontal') ?? null),
                vertical: rule(scale?.getAttribute('vertical') ?? null)
            };
        });
        const width = Math.max(...entities.map((entity) => entity.region.x + entity.region.width));
        const height = Math.max(...entities.map((entity) => entity.region.y + entity.region.height));

        layouts[layout.getAttribute('name')] = { width, height, entities };
    }

    return { layouts };
};

/** Where every entity is drawn when the skinned window is `width` x `height` (the layout is authored at its own bounding size). */
export const layoutNativeSkin = (layout: NativeSkinLayout, width: number, height: number): NativeSkinPiece[] =>
    layout.entities.map((entity) => {
        const extraX = width - layout.width;
        const extraY = height - layout.height;
        const { region } = entity;

        return {
            x: region.x + (entity.horizontal === 'move' ? extraX : 0),
            y: region.y + (entity.vertical === 'move' ? extraY : 0),
            width: region.width + (entity.horizontal === 'strech' ? extraX : 0),
            height: region.height + (entity.vertical === 'strech' ? extraY : 0),
            source: region
        };
    });
