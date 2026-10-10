import { VoltEvent } from '@volt/renderer';

export class InventoryFurniAddedEvent extends VoltEvent {
    public static FURNI_ADDED: string = 'IFAE_FURNI_ADDED';

    constructor(
        public readonly id: number,
        public readonly spriteId: number,
        public readonly category: number
    ) {
        super(InventoryFurniAddedEvent.FURNI_ADDED);
    }
}
