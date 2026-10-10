import { IObjectData, VoltEvent } from '@volt/renderer';
import { CatalogWidgetEvent } from './CatalogWidgetEvent';

export class CatalogSetRoomPreviewerStuffDataEvent extends VoltEvent {
    private _stuffData: IObjectData;

    constructor(stuffData: IObjectData) {
        super(CatalogWidgetEvent.SET_PREVIEWER_STUFFDATA);

        this._stuffData = stuffData;
    }

    public get stuffData(): IObjectData {
        return this._stuffData;
    }
}
