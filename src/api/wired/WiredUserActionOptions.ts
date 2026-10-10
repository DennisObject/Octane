/** Native user-action codes. The owned int is the code; the text carries the sign number or "dance N" when filtered. */
export const USER_ACTION = {
    WAVE: 0,
    BLOW_KISS: 1,
    LAUGH: 2,
    RESPECT: 3,
    AWAKE: 4,
    SLEEP: 5,
    SIT: 6,
    STAND: 7,
    LAY: 8,
    SIGN: 10,
    DANCE: 11,
    THUMB_UP: 67
} as const;

export interface WiredUserActionOption {
    value: number;
    label: string;
    fallback: string;
}

export const USER_ACTION_OPTIONS: WiredUserActionOption[] = [
    { value: USER_ACTION.WAVE, label: 'widget.memenu.wave', fallback: 'Wave' },
    { value: USER_ACTION.BLOW_KISS, label: 'widget.memenu.blow', fallback: 'Blow a kiss' },
    { value: USER_ACTION.LAUGH, label: 'widget.memenu.laugh', fallback: 'Laugh' },
    { value: USER_ACTION.RESPECT, label: 'widget.memenu.respect', fallback: 'Respect' },
    { value: USER_ACTION.AWAKE, label: 'wiredfurni.params.action.4', fallback: 'Awake' },
    { value: USER_ACTION.SLEEP, label: 'widget.memenu.sleep', fallback: 'Sleep' },
    { value: USER_ACTION.SIT, label: 'widget.memenu.sit', fallback: 'Sit' },
    { value: USER_ACTION.STAND, label: 'widget.memenu.stand', fallback: 'Stand' },
    { value: USER_ACTION.LAY, label: 'wiredfurni.params.action.8', fallback: 'Lay' },
    { value: USER_ACTION.SIGN, label: 'widget.memenu.sign', fallback: 'Sign' },
    { value: USER_ACTION.DANCE, label: 'widget.memenu.dance', fallback: 'Dance' },
    { value: USER_ACTION.THUMB_UP, label: 'widget.memenu.thumb', fallback: 'Thumbs up' }
];

export const SIGN_OPTIONS = Array.from({ length: 18 }, (_, value) => ({
    value,
    label: `wiredfurni.params.action.sign.${value}`
}));

export const DANCE_OPTIONS = [
    { value: 1, label: 'widget.memenu.dance1' },
    { value: 2, label: 'widget.memenu.dance2' },
    { value: 3, label: 'widget.memenu.dance3' },
    { value: 4, label: 'widget.memenu.dance4' }
];

/** The text a filtered sign or dance saves; anything else saves empty (unfiltered). */
export const userActionText = (code: number, filtered: boolean, id: number): string => {
    if (!filtered) return '';
    if (code === USER_ACTION.SIGN) return `${id}`;
    if (code === USER_ACTION.DANCE) return `dance ${id}`;

    return '';
};

/** Reads the saved text back into the filter state of its code; sign defaults to 0 and dance to 1. */
export const parseUserActionText = (text: string, code: number): { filtered: boolean; id: number } => {
    const trimmed = (text ?? '').trim();

    if (code === USER_ACTION.SIGN && /^\d+$/.test(trimmed)) return { filtered: true, id: parseInt(trimmed, 10) };

    const dance = /^dance (\d+)$/.exec(trimmed);

    if (code === USER_ACTION.DANCE && dance) return { filtered: true, id: parseInt(dance[1], 10) };

    return { filtered: false, id: code === USER_ACTION.DANCE ? 1 : 0 };
};
