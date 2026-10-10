export class WiredTriggerLayout {
    public static AVATAR_SAYS_SOMETHING: number = 0;
    public static AVATAR_WALKS_ON_FURNI: number = 1;
    public static AVATAR_WALKS_OFF_FURNI: number = 2;
    public static EXECUTE_ONCE: number = 3;
    public static TOGGLE_FURNI: number = 4;
    public static EXECUTE_PERIODICALLY: number = 6;
    public static AVATAR_ENTERS_ROOM: number = 7;
    public static GAME_STARTS: number = 8;
    public static GAME_ENDS: number = 9;
    public static SCORE_ACHIEVED: number = 10;
    public static COLLISION: number = 11;
    public static EXECUTE_PERIODICALLY_LONG: number = 12;
    public static BOT_REACHED_STUFF: number = 13;
    public static BOT_REACHED_AVATAR: number = 14;
    public static RECEIVE_SIGNAL: number = 17;
    public static AVATAR_LEAVES_ROOM: number = 23;
    public static EXECUTE_PERIODICALLY_SHORT: number = 19;
    public static CLICK_FURNI: number = 18;
    public static CLICK_TILE: number = 21;
    public static CLICK_USER: number = 24;
    public static USER_PERFORMS_ACTION: number = 16;
    public static CLOCK_COUNTER: number = 15;
    public static VARIABLE_CHANGED: number = 22;
    public static TRANSACTION_COMPLETE: number = 25;
    public static TRANSACTION_FAIL: number = 26;
    /** Both one-shot definitions use the current half-second timer form. */
    public static EXECUTE_ONCE_LONG: number = 3;
    /**
     * Furni state is changed by anyone or anything, wired effects included; TOGGLE_FURNI (4) only
     * answers a user's click. The emulator registers it on wf_trg_state_changed.
     */
    public static STATE_CHANGE: number = 20;
}
