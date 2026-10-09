// Mirrors the v75 wired slider value converters (common/slider_converter): how a slider step is shown and typed.
export interface WiredSliderConverter {
    toIntParam: (text: string) => number;
    toString: (value: number) => string;
    precision: number;
    endsWithFive: boolean;
}

export const WIRED_SLIDER_ECHO: WiredSliderConverter = {
    toIntParam: (text) => parseInt(text, 10) || 0,
    toString: (value) => `${value}`,
    precision: 0,
    endsWithFive: false
};

export const WIRED_SLIDER_PULSES: WiredSliderConverter = {
    toIntParam: (text) => Math.round(Number(text) * 2),
    toString: (value) => (value % 2 === 0 ? `${Math.floor(value / 2)}` : `${Math.floor(value / 2)}.5`),
    precision: 1,
    endsWithFive: true
};

export const WIRED_SLIDER_SECONDS_5: WiredSliderConverter = {
    toIntParam: (text) => Math.round(Number(text) / 5),
    toString: (value) => `${value * 5}`,
    precision: 0,
    endsWithFive: true
};

export const WIRED_SLIDER_HUNDREDTH: WiredSliderConverter = {
    toIntParam: (text) => Math.round(Number(text) * 100),
    toString: (value) => (value / 100).toFixed(2),
    precision: 2,
    endsWithFive: false
};

export const WIRED_SLIDER_MILLISECONDS_50: WiredSliderConverter = {
    toIntParam: (text) => Math.trunc(Number(text) / 50),
    toString: (value) => `${value * 50}`,
    precision: -1,
    endsWithFive: true
};

export const wiredSliderCountOrUnlimited = (unlimitedValue: number): WiredSliderConverter => ({
    toIntParam: (text) => Math.trunc(Number(text)),
    toString: (value) => (value === unlimitedValue ? '∞' : `${value}`),
    precision: 0,
    endsWithFive: false
});
