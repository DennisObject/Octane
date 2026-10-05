import { WiredActionLayoutCode } from './WiredActionLayoutCode';

/** The native picker stores Default as an empty preference. */
export const WIRED_STYLE_DEFAULT = '';
export const WIRED_STYLE_OPTIONS = [WIRED_STYLE_DEFAULT, 'volter', 'volter_blue', 'volter_green', 'volter_yellow', 'illumina', 'ubuntu'] as const;

export type WiredStyleName = (typeof WIRED_STYLE_OPTIONS)[number];
export type WiredShellStyle = Exclude<WiredStyleName, ''>;
export type WiredVolterStyle = Extract<WiredShellStyle, `volter${string}`>;

export const normalizeWiredStyle = (value: unknown): WiredStyleName =>
    typeof value === 'string' && (WIRED_STYLE_OPTIONS as readonly string[]).includes(value) ? (value as WiredStyleName) : WIRED_STYLE_DEFAULT;

/** v75 bRe selects prototype factories before the active ordinary factory. */
export const resolveWiredStyle = (activeStyle: WiredShellStyle, furniClassName: string = ''): WiredShellStyle => {
    switch (furniClassName) {
        case 'wf_ltdproto_act_toggle_state':
            return 'volter_yellow';
        case 'wf_proto_trg_at_given_time':
            return 'volter_blue';
        case 'wf_proto_cnd_trggrer_on_frn':
            return 'volter_green';
        default:
            return activeStyle;
    }
};

export const wiredStyleClassName = (value: WiredShellStyle): string => `octane-wired--style-${value}`;

export const isWiredVolterStyle = (value: WiredShellStyle): value is WiredVolterStyle => value.startsWith('volter');

export const wiredStyleWidth = (style: WiredShellStyle): number =>
    style === 'volter_blue' || style === 'volter_green' || style === 'volter_yellow' ? 256 : 240;

/** Matched subtype controllers, not the compatibility views' cardStyle widths. */
export const wiredWidthMultiplier = (wiredType: string, code: number): number => {
    if (wiredType === 'action') {
        if (code === WiredActionLayoutCode.RESET) return 1.06; // fke:417428
        if (code === WiredActionLayoutCode.PLACE_FURNI) return 1.2; // ake:416900
    }
    if (wiredType === 'extra') {
        if (code === WiredActionLayoutCode.PROJECTILE_EXTRA) return 1.3; // aAe:412944
        if (code === WiredActionLayoutCode.VARIABLE_WEB_API_EXTRA) return 1.4; // IY:413916
        if (code === WiredActionLayoutCode.CUSTOM_CONTRACT) return 1.2; // hAe:414180
        if (code >= WiredActionLayoutCode.VARIABLE_FX_HEALTH_POINTS_EXTRA && code <= WiredActionLayoutCode.VARIABLE_FX_NUMBER_DISPLAY_EXTRA) return 1.45; // Cb:414466
    }
    return 1;
};

/** "volter_blue" shown the way the official picker shows it: "Volter Blue". */
export const wiredStyleTitle = (value: string): string =>
    value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
