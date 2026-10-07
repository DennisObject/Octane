import { IFigurePartSet } from '@octane/renderer';

export const AvatarEditorPartSorter = (hcFirst: boolean) => {
    return (a: { partSet: IFigurePartSet; usesColor: boolean; isClear?: boolean }, b: { partSet: IFigurePartSet; usesColor: boolean; isClear?: boolean }) => {
        const clubLevelA = !a.partSet ? (hcFirst ? Number.MAX_SAFE_INTEGER : -1) : a.partSet.clubLevel;
        const clubLevelB = !b.partSet ? (hcFirst ? Number.MAX_SAFE_INTEGER : -1) : b.partSet.clubLevel;
        const isSellableA = !a.partSet ? false : a.partSet.isSellable;
        const isSellableB = !b.partSet ? false : b.partSet.isSellable;

        if (isSellableA && !isSellableB) return 1;

        if (isSellableB && !isSellableA) return -1;

        if (hcFirst) {
            if (clubLevelA > clubLevelB) return -1;

            if (clubLevelA < clubLevelB) return 1;
        } else {
            if (clubLevelA < clubLevelB) return -1;

            if (clubLevelA > clubLevelB) return 1;
        }

        const idA = a.partSet?.id ?? -1;
        const idB = b.partSet?.id ?? -1;

        return hcFirst ? idB - idA : idA - idB;
    };
};
