import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, PlaySound, SoundNames } from '../../../../api';
import { ISnowWarEngine, SnowWarEngineState } from '../../../../api/snowwar';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { useUserDataSnapshot } from '../../../../hooks';
import { SnowWarAvatarImage } from './SnowWarAvatarImage';
import { SNOWWAR_EXPLOSION_OFFSETS, SnowWarAnimation, SnowWarBitmap, SnowWarBox, snowWarBitmapSize, snowWarBitmapUrl } from './SnowWarBitmap';
import { SnowWarStrokeText, SnowWarText } from './SnowWarText';

// SnowWarUI constants.
const MAX_SNOWBALLS = 5;
const SCORE_FLASH_FRAMES = 4;
const SCORE_FRAME_LENGTH = 50;
const CALL_FOR_HELP = 'HBST_call_for_help';
const BALL_Y = [ 158, 122, 86, 50, 14 ];

interface HudSnapshot
{
    score: number;
    snowballs: number;
    hitPoints: number;
    team1: number;
    team2: number;
    seconds: number;
}

const readSnapshot = (engine: ISnowWarEngine): HudSnapshot =>
{
    const own = engine.getOwnHuman();

    return {
        score: own?.score ?? 0,
        snowballs: own?.snowballs ?? MAX_SNOWBALLS,
        hitPoints: own?.hitPoints ?? 5,
        team1: engine.teamScores[0] ?? 0,
        team2: engine.teamScores[1] ?? 0,
        seconds: Math.max(0, Math.trunc(engine.secondsLeft))
    };
};

const sameSnapshot = (a: HudSnapshot, b: HudSnapshot) =>
    a.score === b.score && a.snowballs === b.snowballs && a.hitPoints === b.hitPoints && a.team1 === b.team1 && a.team2 === b.team2 && a.seconds === b.seconds;

/** Desktop size; the HUD windows are placed against it like SnowWarUI.init. */
const useDesktopSize = () =>
{
    const [ size, setSize ] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() =>
    {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return size;
};

/** `counter` (164x164, centred): explosion0001..0005 one second each, 0006..0010 after >100 ms, then disposed. */
const SnowWarCountdownView: FC<{ startedAt: number; desktop: { width: number; height: number } }> = ({ startedAt, desktop }) =>
{
    const [ frame, setFrame ] = useState(1);

    useEffect(() =>
    {
        // initCountDown → initCounter(); update(1000): frame 1 shows at once.
        let current = 1;
        let elapsed = 1000;
        let last = performance.now();
        let request = 0;

        const tick = (now: number) =>
        {
            elapsed += now - last;
            last = now;

            let advance = false;

            if(current < 6) advance = elapsed >= 1000;
            else if(current < 11) advance = elapsed > 100;
            else
            {
                setFrame(0);

                return;
            }

            if(advance)
            {
                elapsed = 0;
                setFrame(current);
                current++;
            }

            request = requestAnimationFrame(tick);
        };

        request = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(request);
    }, [ startedAt ]);

    if(!frame) return null;

    const name = `explosion${ String(frame).padStart(4, '0') }`;
    const [ offsetX, offsetY ] = SNOWWAR_EXPLOSION_OFFSETS[frame - 1];
    const [ width, height ] = snowWarBitmapSize(name);

    return (
        <SnowWarBox className="snowwar-hud-window snowwar-counter" name="counterBitmap" x={Math.trunc((desktop.width - 164) / 2)} y={Math.trunc((desktop.height - 164) / 2)} width={164} height={164}>
            <img alt="" draggable={false} src={snowWarBitmapUrl(name)} style={{ position: 'absolute', left: -offsetX, top: -offsetY, width, height, imageRendering: 'pixelated' }} />
        </SnowWarBox>
    );
};

/** `snowwar_exit_confirmation` frame (270x163) at the layout's own (0, 0). */
const SnowWarExitConfirmationView: FC<{ onYes: () => void; onNo: () => void }> = ({ onYes, onNo }) => (
    <VoltCardView className="snowwar-window snowwar-game-window snowwar-exit-confirmation" frameStyle={3} initialPosition={{ x: 0, y: 0 }} isResizable={false} uniqueKey="snowwar-exit-confirmation" style={{ width: 270, height: 163 }}>
        <VoltCardHeaderView headerText={LocalizeText('snowwar.exit.title')} onCloseClick={onNo} />
        <div className="snowwar-frame-content" style={{ width: 264, height: 124 }}>
            <SnowWarText align="center" bold size={13} text={LocalizeText('snowwar.exit.confirmation')} wrap x={12} y={12} width={238} height={18} />
            <button className="snowwar-shiny-button" data-air-name="no" style={{ left: 8, top: 80, width: 110, height: 35 }} type="button" onClick={onNo}>{LocalizeText('snowwar.exit.no')}</button>
            <button className="snowwar-shiny-button" data-air-name="yes" style={{ left: 144, top: 80, width: 110, height: 35 }} type="button" onClick={onYes}>{LocalizeText('snowwar.exit.yes')}</button>
        </div>
    </VoltCardView>
);

interface SnowWarHudViewProps
{
    engine: ISnowWarEngine;
    /** Exit confirmation "yes": Game2ExitGame and leave the arena. */
    onExit: () => void;
}

/** SnowWarUI: the in-game HUD windows over the arena. */
export const SnowWarHudView: FC<SnowWarHudViewProps> = ({ engine, onExit }) =>
{
    const desktop = useDesktopSize();
    const userData = useUserDataSnapshot();
    const [ hud, setHud ] = useState<HudSnapshot>(() => readSnapshot(engine));
    const [ confirmVisible, setConfirmVisible ] = useState(false);
    const [ waiting, setWaiting ] = useState(false);
    const [ pressed, setPressed ] = useState(false);
    const [ flash, setFlash ] = useState<{ prefix: string; frame: number }>(null);
    const [ hiddenSecond, setHiddenSecond ] = useState(-1);
    const [ countdownAt, setCountdownAt ] = useState<number>(() => (engine.state === SnowWarEngineState.STAGE_STARTING ? performance.now() : 0));
    const pressedRef = useRef(false);

    // GameArenaView.update feeds timer / ownScore / snowballs / hitPoints / team scores every frame.
    useEffect(() =>
    {
        let request = 0;
        let previous = readSnapshot(engine);

        const tick = () =>
        {
            const next = readSnapshot(engine);

            if(!sameSnapshot(previous, next))
            {
                previous = next;
                setHud(next);
            }

            request = requestAnimationFrame(tick);
        };

        request = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(request);
    }, [ engine ]);

    useEffect(() =>
    {
        const press = () =>
        {
            if(engine.makeSnowball()) setWaiting(true);
        };

        const unsubscribers = [
            engine.on('countdown', () => setCountdownAt(performance.now())),
            // startWaitingForSnowball: progress spinner + make sound.
            engine.on('makeStart', event =>
            {
                if(event.humanId !== engine.ownId) return;

                setWaiting(true);
                PlaySound(SoundNames.SNOWWAR_MAKE_SNOWBALL);
            }),
            // stopWaitingForSnowball: auto-repeat while the button is held.
            engine.on('makeEnd', event =>
            {
                if(event.humanId !== engine.ownId) return;

                setWaiting(false);
                if(pressedRef.current) press();
            }),
            // registerHit: plus when our ball hit, minus when we were hit.
            engine.on('hit', event =>
            {
                if(!event.damaged) return;

                if(event.humanId === engine.ownId) setFlash({ prefix: 'ui_me_minus_', frame: 1 });
                else if(event.byHumanId === engine.ownId) setFlash({ prefix: 'ui_me_plus_', frame: 1 });
            })
        ];

        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, [ engine ]);

    // updateScoreFlash: four frames of 50 ms, then hidden.
    useEffect(() =>
    {
        if(!flash) return;

        const timer = setTimeout(() => setFlash(flash.frame >= SCORE_FLASH_FRAMES ? null : { ...flash, frame: flash.frame + 1 }), SCORE_FRAME_LENGTH);

        return () => clearTimeout(timer);
    }, [ flash ]);

    // set timer: every new second in 1..5 beeps and hides the time after 500 ms.
    useEffect(() =>
    {
        if(hud.seconds > 5 || hud.seconds <= 0) return;

        PlaySound(CALL_FOR_HELP);

        const second = hud.seconds;
        const timer = setTimeout(() => setHiddenSecond(second), 500);

        return () => clearTimeout(timer);
    }, [ hud.seconds ]);

    const timeVisible = hiddenSecond !== hud.seconds;

    const makeSnowball = (down: boolean) =>
    {
        pressedRef.current = down;
        setPressed(down);

        if(down && engine.makeSnowball()) setWaiting(true);
    };

    const minutes = String(Math.trunc(hud.seconds / 60)).padStart(2, '0');
    const seconds = String(hud.seconds % 60).padStart(2, '0');
    const snowballsY = Math.trunc((desktop.height - 260) / 2);

    return (
        <div className="snowwar-hud">
            <SnowWarBox className="snowwar-hud-window snowwar-clickable" name="snowwar_exit" x={0} y={10} width={68} height={50} onClick={() => setConfirmVisible(true)}>
                <SnowWarBitmap bitmap="ui_exit_down" name="backgroundImage" x={0} y={0} width={68} height={50} />
            </SnowWarBox>

            <SnowWarBox className="snowwar-hud-window" name="snowwar_snowballs" x={10} y={snowballsY} width={57} height={260}>
                <SnowWarBitmap bitmap="ui_ball_indicator_bg" name="backgroundImage" x={0} y={0} width={57} height={202} />
                {BALL_Y.map((y, index) => index < hud.snowballs && <SnowWarBitmap key={index} bitmap="ui_ball" name={`ball_${ index }`} x={14} y={y} width={30} height={30} />)}
                {waiting && hud.snowballs < MAX_SNOWBALLS && <SnowWarAnimation frames={8} name="ballProgress" prefix="load_" x={14} y={BALL_Y[hud.snowballs]} width={30} height={30} />}
                {hud.snowballs === 0 && !waiting && <SnowWarAnimation frames={4} interval={75} name="emptyFlashImage" pingPong prefix="ui_no_balls_" x={0} y={0} width={57} height={202} />}
                <SnowWarBox
                    className="snowwar-clickable"
                    name="make_snowball"
                    x={0}
                    y={202}
                    width={57}
                    height={58}
                >
                    <div onMouseDown={() => makeSnowball(true)} onMouseLeave={() => pressedRef.current && makeSnowball(false)} onMouseUp={() => makeSnowball(false)}>
                        <SnowWarBitmap bitmap={pressed ? 'ui_make_balls_down' : 'ui_make_balls_up'} name="makeSnowballImage" x={0} y={0} width={57} height={58} />
                    </div>
                </SnowWarBox>
            </SnowWarBox>

            <SnowWarBox className="snowwar-hud-window" name="snowwar_own_stats" x={10} y={desktop.height - 73 - 10} width={171} height={73}>
                <SnowWarBitmap bitmap="ui_me_bg" name="backgroundImage" x={0} y={0} width={171} height={73} />
                <SnowWarBitmap bitmap={`ui_me_health_${ Math.max(0, Math.min(5, hud.hitPoints)) }`} name="energy_bar" x={73} y={14} width={8} height={46} />
                {flash && <SnowWarBitmap bitmap={flash.prefix + flash.frame} name="backgroundFlashImage" x={100} y={8} width={57} height={57} />}
                {userData.figure && <SnowWarAvatarImage direction={2} figure={userData.figure} gender={userData.gender} name="user_image" setType="head" x={0} y={0} width={73} height={73} />}
                <SnowWarStrokeText align="center" name="personal_score" size={24} strokeColor={0x1077ac} text={String(hud.score)} x={101} y={20} width={55} height={30} />
            </SnowWarBox>

            <SnowWarBox className="snowwar-hud-window" name="snowwar_team_scores" x={desktop.width - 189 - 10} y={10} width={189} height={147}>
                <SnowWarBitmap bitmap="ui_timer_and_points" name="backgroundImage" x={0} y={0} width={188} height={147} />
                <SnowWarStrokeText align="center" name="score_blue" size={20} strokeColor={0x1077ac} text={String(hud.team1)} x={29} y={44} width={56} height={27} />
                <SnowWarStrokeText align="center" name="score_red" size={20} strokeColor={0xfd6859} text={String(hud.team2)} x={104} y={44} width={56} height={27} />
            </SnowWarBox>

            <SnowWarBox className="snowwar-hud-window" name="snowwar_timer" x={desktop.width - 100 - 50} y={105} width={100} height={46}>
                {timeVisible && <SnowWarStrokeText name="time_left" size={25} strokeColor={0x1077ac} text={`${ minutes }:${ seconds }`} x={16} y={6} width={80} height={31} style={{ width: 'auto', minWidth: 80 }} />}
            </SnowWarBox>

            {countdownAt > 0 && <SnowWarCountdownView key={countdownAt} desktop={desktop} startedAt={countdownAt} />}

            {confirmVisible && <SnowWarExitConfirmationView onNo={() => setConfirmVisible(false)} onYes={onExit} />}
        </div>
    );
};
