import { FC } from 'react';
import volterMove3 from '../../../assets/images/wired/icon_wired_dir_ne.png';
import volterMove4 from '../../../assets/images/wired/icon_wired_dir_n.png';
import volterMove5 from '../../../assets/images/wired/icon_wired_dir_nw.png';
import volterMove2 from '../../../assets/images/wired/icon_wired_dir_e.png';
import volterMoveVrt from '../../../assets/images/wired/icon_wired_dir_horizontal_random.png';
import volterMoveRnd from '../../../assets/images/wired/icon_wired_dir_random.png';
import volterMove0 from '../../../assets/images/wired/icon_wired_dir_s.png';
import volterMove1 from '../../../assets/images/wired/icon_wired_dir_se.png';
import volterMove7 from '../../../assets/images/wired/icon_wired_dir_sw.png';
import volterMoveDiag from '../../../assets/images/wired/icon_wired_dir_vertical_random.png';
import volterMove6 from '../../../assets/images/wired/icon_wired_dir_w.png';
import illuminaMove0 from '../../../assets/images/wired/native/move_0.png';
import illuminaMove1 from '../../../assets/images/wired/native/move_1.png';
import illuminaMove2 from '../../../assets/images/wired/native/move_2.png';
import illuminaMove3 from '../../../assets/images/wired/native/move_3.png';
import illuminaMove4 from '../../../assets/images/wired/native/move_4.png';
import illuminaMove5 from '../../../assets/images/wired/native/move_5.png';
import illuminaMove6 from '../../../assets/images/wired/native/move_6.png';
import illuminaMove7 from '../../../assets/images/wired/native/move_7.png';
import illuminaMoveDiag from '../../../assets/images/wired/native/move_diag.png';
import illuminaMoveRnd from '../../../assets/images/wired/native/move_rnd.png';
import illuminaMoveVrt from '../../../assets/images/wired/native/move_vrt.png';
import { useWiredNative } from './WiredNativeContext';

/** AIR radio groups list move_0..move_7 in four columns: ↗ → ↘ ↓ / ↙ ← ↖ ↑. */
export const WIRED_DIRECTION_GRID = [
    [0, 1, 2, 3],
    [4, 5, 6, 7]
];

/** AIR icon asset suffix: a room direction 0-7 (move_<n>) or one of move_rotate's random moves. */
export type WiredMoveIconName = number | 'diag' | 'vrt' | 'rnd';

/*
 * AIR resolves "move_<name>" to wired_styles_<style>_move_<name>, so Illumina draws plain arrows and the
 * Volter styles their diamond tiles. The icon_wired_dir_* files are the Volter bitmaps under older names.
 */
const ILLUMINA_MOVE_ICONS: Record<string, string> = {
    0: illuminaMove0,
    1: illuminaMove1,
    2: illuminaMove2,
    3: illuminaMove3,
    4: illuminaMove4,
    5: illuminaMove5,
    6: illuminaMove6,
    7: illuminaMove7,
    diag: illuminaMoveDiag,
    vrt: illuminaMoveVrt,
    rnd: illuminaMoveRnd
};

const VOLTER_MOVE_ICONS: Record<string, string> = {
    0: volterMove0,
    1: volterMove1,
    2: volterMove2,
    3: volterMove3,
    4: volterMove4,
    5: volterMove5,
    6: volterMove6,
    7: volterMove7,
    diag: volterMoveDiag,
    vrt: volterMoveVrt,
    rnd: volterMoveRnd
};

interface WiredDirectionIconProps {
    direction: number;
    selected?: boolean;
    debugValue?: number | string;
    showImage?: boolean;
    /** Which move_* icon to draw when it is not move_<direction>. */
    icon?: WiredMoveIconName;
}

export const WiredDirectionIcon: FC<WiredDirectionIconProps> = (props) => {
    const { direction = 0, selected = false, debugValue = null, showImage = true, icon = direction } = props;
    const native = useWiredNative();
    const src = (native ? ILLUMINA_MOVE_ICONS : VOLTER_MOVE_ICONS)[icon];

    return (
        <span className="inline-flex flex-col items-center justify-center leading-none">
            {showImage && <img alt="" className={`h-auto w-auto object-contain ${selected ? 'brightness-100' : 'opacity-90'}`} draggable={false} src={src} />}
            {debugValue !== null && debugValue !== undefined && <span className={`${showImage ? 'mt-[1px]' : ''} text-[9px] text-black`}>{debugValue}</span>}
        </span>
    );
};
