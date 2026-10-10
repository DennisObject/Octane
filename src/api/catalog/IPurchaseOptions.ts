import { IObjectData } from '@volt/renderer';

export interface IPurchaseOptions {
    quantity?: number;
    extraData?: string;
    extraParamRequired?: boolean;
    previewStuffData?: IObjectData;
}
