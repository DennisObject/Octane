import { VoltEvent, PurchaseOKMessageOfferData } from '@volt/renderer';

export class CatalogPurchasedEvent extends VoltEvent {
    public static PURCHASE_SUCCESS: string = 'CPE_PURCHASE_SUCCESS';

    private _purchase: PurchaseOKMessageOfferData;

    constructor(purchase: PurchaseOKMessageOfferData) {
        super(CatalogPurchasedEvent.PURCHASE_SUCCESS);

        this._purchase = purchase;
    }

    public get purchase(): PurchaseOKMessageOfferData {
        return this._purchase;
    }
}
