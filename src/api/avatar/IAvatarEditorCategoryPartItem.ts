import { IFigurePartSet } from '@volt/renderer';

export interface IAvatarEditorCategoryPartItem {
    id?: number;
    partSet?: IFigurePartSet;
    usesColor?: boolean;
    maxPaletteCount?: number;
    isClear?: boolean;
    isGetMore?: boolean;
    isSellableNotOwned?: boolean;
}
