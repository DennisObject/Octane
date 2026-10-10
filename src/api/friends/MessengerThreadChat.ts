export class MessengerThreadChat {
    public static CHAT: number = 0;
    public static ROOM_INVITE: number = 1;
    public static STATUS_NOTIFICATION: number = 2;
    public static SECURITY_NOTIFICATION: number = 3;
    public static SENT: number = 0;
    public static READ: number = 1;
    private static CHAT_ID: number = 0;

    private _id: number;
    private _type: number;
    private _status: number = MessengerThreadChat.SENT;
    private _senderId: number;
    private _message: string;
    private _secondsSinceSent: number;
    private _extraData: string;
    private _date: Date;

    constructor(senderId: number, message: string, secondsSinceSent: number = 0, extraData: string = null, type: number = 0) {
        this._id = ++MessengerThreadChat.CHAT_ID;
        this._type = type;
        this._senderId = senderId;
        this._message = message;
        this._secondsSinceSent = secondsSinceSent;
        this._extraData = extraData;
        this._date = new Date();
    }

    public get id(): number {
        return this._id;
    }

    public get type(): number {
        return this._type;
    }

    public get senderId(): number {
        return this._senderId;
    }

    public get message(): string {
        return this._message;
    }

    public get secondsSinceSent(): number {
        return this._secondsSinceSent;
    }

    public get extraData(): string {
        return this._extraData;
    }

    public get offlineDelivered(): boolean {
        return this._type === MessengerThreadChat.CHAT && this._extraData === 'offline';
    }

    public get status(): number {
        return this._status;
    }

    public setStatus(status: number): void {
        this._status = status;
    }

    public get date(): Date {
        return this._date;
    }
}
