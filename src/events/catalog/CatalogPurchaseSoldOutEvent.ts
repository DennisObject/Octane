import { VoltEvent } from '@volt/renderer';

export class CatalogPurchaseSoldOutEvent extends VoltEvent {
    public static SOLD_OUT: string = 'CPSOE_SOLD_OUT';

    constructor() {
        super(CatalogPurchaseSoldOutEvent.SOLD_OUT);
    }
}
