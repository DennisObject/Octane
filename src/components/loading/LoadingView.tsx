import { FC, useEffect, useState } from 'react';
import splashBackground from '@/assets/images/loading/splash_bg.png';
import splashTop from '@/assets/images/loading/splash_top.png';

// Classic JS client loading screen (75_classic-js HabboAirLauncher: eSe + JRe).

const USER_PHOTOS = Object.values(import.meta.glob('../../assets/images/loading/userphoto_*.png', { eager: true, import: 'default' }) as Record<string, string>);

// default_localizations_en client.starting.revolving
const REVOLVING_MESSAGES = [
    'For science, you monster',
    'Loading funny message…please wait.',
    'Would you like fries with that?',
    'Follow the yellow duck.',
    'Time is just an illusion.',
    'Are we there yet?!',
    'I like your t-shirt.',
    'Look left. Look right. Blink twice. Ta da!',
    "It's not you, it's me.",
    "Shhh! I'm trying to think here.",
    'Loading pixel universe.'
];

const BAR_WIDTH = 400;
const BAR_HEIGHT = 25;
const BAR_INSET = 4;
const BAR_TICK_MS = 750;

// The loading screen opens once the bootstrap is done, so real progress fills the last 40%.
const BOOTSTRAP_PROGRESS = 0.6;

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

interface LoadingViewProps {
    backToHotelUrl?: string;
    isError?: boolean;
    message?: string;
    progress?: number;
}

export const LoadingView: FC<LoadingViewProps> = (props) => {
    const { backToHotelUrl, isError = false, message = '', progress = 0 } = props;
    const [photo] = useState(() => USER_PHOTOS[randomBetween(0, USER_PHOTOS.length - 1)]);
    const [firstMessageIndex] = useState(() => randomBetween(0, REVOLVING_MESSAGES.length - 1));
    const [messageIndex, setMessageIndex] = useState(firstMessageIndex);
    const [barProgress, setBarProgress] = useState<number | null>(null);

    useEffect(() => {
        if (isError) return;

        // The bar is decorative: it fills in random steps, holds full for one tick, then restarts with the next message.
        let value = 0;
        let swapMessage = false;
        let nextIndex = firstMessageIndex;

        const interval = window.setInterval(() => {
            if (value === 100) {
                if (swapMessage) {
                    setMessageIndex(nextIndex);
                    swapMessage = false;
                }

                value = 0;
            } else {
                value += Math.min(randomBetween(35, Math.min(randomBetween(45, 55), 100 - value)), 100 - value);
            }

            if (value === 100) {
                swapMessage = true;
                nextIndex = (nextIndex + 1) % (REVOLVING_MESSAGES.length - 1);
            }

            setBarProgress(value / 100);
        }, BAR_TICK_MS);

        return () => window.clearInterval(interval);
    }, [isError, firstMessageIndex]);

    const percent = Math.round(Math.min(1, BOOTSTRAP_PROGRESS + (Math.max(0, Math.min(100, progress)) / 100) * (1 - BOOTSTRAP_PROGRESS)) * 100);
    const fillWidth = (BAR_WIDTH - BAR_INSET * 2) * (barProgress ?? 0);
    const fillHeight = BAR_HEIGHT - BAR_INSET * 2;

    return (
        <div className={isError
            ? `classic-loading-screen classic-loading-screen--error${backToHotelUrl ? ' classic-loading-screen--recoverable' : ''}`
            : 'classic-loading-screen'}>
            <div className="classic-loading-screen__photo">
                <img src={splashBackground} alt="" draggable={false} />
                <img src={photo} alt="" draggable={false} className="classic-loading-screen__userphoto" />
                <img src={splashTop} alt="" draggable={false} />
            </div>
            <div className="classic-loading-screen__text">{isError ? 'Loading failed' : REVOLVING_MESSAGES[messageIndex]}</div>
            <div className="classic-loading-screen__bar">
                {barProgress !== null && (
                    <>
                        <div className="classic-loading-screen__bar-back" />
                        <div className="classic-loading-screen__bar-top" style={{ width: fillWidth, height: fillHeight / 2 }} />
                        <div className="classic-loading-screen__bar-bottom" style={{ width: fillWidth, top: BAR_INSET + fillHeight / 2, height: fillHeight / 2 + 1 }} />
                    </>
                )}
            </div>
            {!isError && <div className="classic-loading-screen__percent">{percent}%</div>}
            {isError && <div className="classic-loading-screen__error">{message}</div>}
            {isError && backToHotelUrl && (
                <a className="classic-loading-screen__back" href={backToHotelUrl}>Back to Hotel</a>
            )}
        </div>
    );
};
