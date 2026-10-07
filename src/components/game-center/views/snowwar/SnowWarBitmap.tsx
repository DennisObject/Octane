import { CSSProperties, FC, ReactNode, useEffect, useState } from 'react';

// HabboGamesCom bitmaps from the v75 library (byte-identical PNGs).
const BITMAP_URLS = Object.fromEntries(
    Object.entries(import.meta.glob('../../../../assets/images/snowstorm/air/*.png', { eager: true, import: 'default' }))
        .map(([ path, url ]) => [ path.slice(path.lastIndexOf('/') + 1, -4), url ])
);

// Intrinsic sizes: AIR centres every bitmap inside its bitmap window
// (WindowUtils.setDefaultElementImage / setElementImage), so the offset needs them up front.
const BITMAP_SIZES: Record<string, [number, number]> = {
    add_friend_icon_blue: [13, 14],
    add_friend_icon_green: [13, 14],
    add_friend_icon_red: [13, 14],
    arena_10_preview: [191, 97],
    arena_11_preview: [191, 97],
    arena_12_preview: [191, 97],
    arena_8_preview: [191, 97],
    arena_9_preview: [191, 97],
    balls_1: [142, 165],
    balls_2: [142, 165],
    balls_3: [142, 165],
    balls_4: [142, 165],
    balls_5: [142, 165],
    bg_sky: [1, 158],
    bg_sunshine: [569, 144],
    bg_vista_1: [444, 133],
    bg_vista_2: [444, 187],
    bg_vista_3: [444, 274],
    blue_ball: [59, 59],
    blue_glove: [80, 101],
    blue_infobox: [162, 63],
    blue_square: [62, 63],
    btn_more_games_10: [52, 62],
    btn_more_games_100: [52, 62],
    btn_more_games_100_hi: [52, 62],
    btn_more_games_10_hi: [52, 62],
    btn_more_games_300: [52, 62],
    btn_more_games_300_hi: [52, 62],
    explosion0001: [30, 49],
    explosion0002: [38, 53],
    explosion0003: [46, 72],
    explosion0004: [54, 86],
    explosion0005: [37, 93],
    explosion0006: [81, 102],
    explosion0007: [102, 111],
    explosion0008: [106, 96],
    explosion0009: [117, 102],
    explosion0010: [78, 75],
    green_square: [62, 63],
    hc_icon: [24, 24],
    leaderboard_bg: [431, 472],
    leaderboard_divider: [350, 2],
    leaderboard_highlighter: [356, 42],
    left_black: [119, 28],
    left_blue: [119, 28],
    load_1: [29, 29],
    load_2: [29, 29],
    load_3: [29, 29],
    load_4: [29, 29],
    load_5: [29, 29],
    load_6: [29, 29],
    load_7: [29, 29],
    load_8: [29, 29],
    move_1: [106, 115],
    move_2: [106, 115],
    move_3: [106, 115],
    move_4: [106, 115],
    pagination_ball: [7, 7],
    pagination_ball_hilite: [7, 7],
    quick_play_background: [405, 357],
    quick_play_teaser: [365, 117],
    red_ball: [59, 59],
    red_glove: [80, 101],
    red_infobox: [162, 63],
    red_square: [62, 63],
    rematch_1: [61, 61],
    rematch_2: [61, 61],
    rematch_3: [61, 61],
    rematch_4: [61, 61],
    rematch_5: [61, 61],
    rematch_6: [61, 61],
    right_black: [119, 28],
    right_blue: [119, 28],
    scroll_down_click: [58, 28],
    scroll_down_hilite: [58, 28],
    scroll_down_normal: [58, 28],
    scroll_left: [14, 18],
    scroll_right: [14, 18],
    scroll_up_click: [58, 28],
    scroll_up_hilite: [58, 28],
    scroll_up_normal: [58, 28],
    snowstorm_logo: [308, 83],
    star_empty: [14, 13],
    star_filled_bronze: [14, 14],
    star_filled_gold: [14, 14],
    star_filled_silver: [14, 14],
    throw_1_1: [168, 73],
    throw_1_2: [168, 73],
    throw_1_3: [168, 73],
    throw_1_4: [168, 73],
    throw_2_1: [200, 130],
    throw_2_2: [200, 130],
    throw_2_3: [200, 130],
    throw_2_4: [200, 130],
    throw_2_5: [200, 130],
    throw_3_1: [200, 166],
    throw_3_2: [200, 166],
    throw_3_3: [200, 166],
    throw_3_4: [200, 166],
    throw_3_5: [200, 166],
    ui_ball: [29, 29],
    ui_ball_indicator_bg: [57, 202],
    ui_exit_down: [68, 50],
    ui_make_balls_down: [57, 58],
    ui_make_balls_up: [57, 58],
    ui_me_bg: [171, 73],
    ui_me_health_0: [8, 46],
    ui_me_health_1: [8, 46],
    ui_me_health_2: [8, 46],
    ui_me_health_3: [8, 46],
    ui_me_health_4: [8, 46],
    ui_me_health_5: [8, 46],
    ui_me_minus_1: [57, 57],
    ui_me_minus_2: [57, 57],
    ui_me_minus_3: [57, 57],
    ui_me_minus_4: [57, 57],
    ui_me_plus_1: [57, 57],
    ui_me_plus_2: [57, 57],
    ui_me_plus_3: [57, 57],
    ui_me_plus_4: [57, 57],
    ui_no_balls_1: [29, 173],
    ui_no_balls_2: [29, 173],
    ui_no_balls_3: [29, 173],
    ui_no_balls_4: [29, 173],
    ui_timer_and_points: [188, 147]
};

/** Countdown frame registration points from the HabboGamesCom manifest (`offset`). */
export const SNOWWAR_EXPLOSION_OFFSETS: [number, number][] = [
    [ -64, -64 ], [ -59, -58 ], [ -55, -53 ], [ -51, -46 ], [ -60, -39 ],
    [ -35, -31 ], [ -28, -23 ], [ -28, -23 ], [ -25, -25 ], [ -52, -39 ]
];

export const snowWarBitmapUrl = (name: string) => BITMAP_URLS[name] ?? null;

export const snowWarBitmapSize = (name: string) => BITMAP_SIZES[name] ?? [ 0, 0 ];

export interface SnowWarBoxProps
{
    x: number;
    y: number;
    width: number;
    height: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}

/** An absolutely positioned AIR window rectangle. */
export const SnowWarBox: FC<SnowWarBoxProps & { name?: string; onClick?: () => void; title?: string }> = ({ x, y, width, height, className, style, children, name, onClick, title }) => (
    <div className={className} data-air-name={name} style={{ position: 'absolute', left: x, top: y, width, height, ...style }} title={title} onClick={onClick}>
        {children}
    </div>
);

/** Draws an image centred in the box with AIR's int truncation, clipped to the box like a BitmapData. */
export const SnowWarImage: FC<SnowWarBoxProps & { src: string; imageWidth: number; imageHeight: number; name?: string }> = ({ src, imageWidth, imageHeight, x, y, width, height, name, className, style, children }) => (
    <SnowWarBox className={className} name={name} x={x} y={y} width={width} height={height} style={{ overflow: 'hidden', ...style }}>
        {src && (
            <img
                alt=""
                draggable={false}
                src={src}
                style={{ position: 'absolute', left: Math.trunc((width - imageWidth) / 2), top: Math.trunc((height - imageHeight) / 2), width: imageWidth, height: imageHeight, maxWidth: 'none', imageRendering: 'pixelated' }}
            />
        )}
        {children}
    </SnowWarBox>
);

/** A `bitmap` window showing a HabboGamesCom asset. */
export const SnowWarBitmap: FC<SnowWarBoxProps & { bitmap: string; name?: string }> = ({ bitmap, ...props }) =>
{
    const [ width, height ] = snowWarBitmapSize(bitmap);

    return <SnowWarImage {...props} src={snowWarBitmapUrl(bitmap)} imageWidth={width} imageHeight={height} />;
};

/** Frame list of `SnowWarAnimatedWindowElement`: prefix1..prefixN, then N-1..2 when it ping-pongs. */
const animationFrames = (prefix: string, count: number, pingPong: boolean) =>
{
    const frames: string[] = [];

    for(let i = 1; i <= count; i++) frames.push(prefix + i);
    if(pingPong) for(let i = count - 1; i > 1; i--) frames.push(prefix + i);

    return frames;
};

/**
 * AIR `SnowWarAnimatedWindowElement`: shows frame index 1 immediately (the constructor
 * pre-increments), then advances every `interval` ms.
 */
export const SnowWarAnimation: FC<SnowWarBoxProps & { prefix: string; frames: number; interval?: number; pingPong?: boolean; name?: string }> = ({ prefix, frames, interval = 100, pingPong = false, ...props }) =>
{
    const list = animationFrames(prefix, frames, pingPong);
    const [ index, setIndex ] = useState(1 % list.length);

    useEffect(() =>
    {
        const timer = setInterval(() => setIndex(value => (value + 1) % list.length), interval);

        return () => clearInterval(timer);
    }, [ prefix, list.length, interval ]);

    return <SnowWarBitmap {...props} bitmap={list[index % list.length]} />;
};
