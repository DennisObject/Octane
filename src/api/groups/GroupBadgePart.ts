export class GroupBadgePart {
    public static BASE: string = 'b';
    public static SYMBOL: string = 's';

    public type: string;
    public key: number;
    public color: number;
    public position: number;

    constructor(type: string, key?: number, color?: number, position?: number) {
        this.type = type;
        this.key = key ?? 0;
        this.color = color ?? 0;
        this.position = position ?? 4;
    }

    public get code(): string {
        if (this.key === 0 && this.type !== GroupBadgePart.BASE) return null;

        return GroupBadgePart.getCode(this.type, this.key, this.color, this.position);
    }

    /** The code to draw: a layer without a part (key 0, including an unset base) draws nothing. */
    public get previewCode(): string {
        if (this.key === 0) return null;

        return GroupBadgePart.getCode(this.type, this.key, this.color, this.position);
    }

    public static getCode(type: string, key: number, color: number, position: number): string {
        return type + (key < 10 ? '0' : '') + key + (color < 10 ? '0' : '') + color + position;
    }
}
