import { CSSProperties, FC, useLayoutEffect, useRef, useState } from 'react';
import { AchievementUtilities, LocalizeText } from '../../api';
import { AchievementText } from './AchievementText';

interface AirAchievementProgressBarProps {
    progress: number;
    maxProgress: number;
    identity?: number;
    localizationKey?: string;
    width: number;
    scoreAtStartOfLevel?: number;
    className?: string;
}

export const AirAchievementProgressBar: FC<AirAchievementProgressBarProps> = ({
    progress,
    maxProgress,
    identity = 0,
    localizationKey,
    width,
    scoreAtStartOfLevel = 0,
    className = ''
}) => {
    const targetWidth = maxProgress > 0 ? Math.max(0, Math.round((width * progress) / maxProgress)) : 0;
    const currentWidth = useRef(targetWidth);
    const previousValues = useRef({ identity, maxProgress });
    const [animation, setAnimation] = useState({ width: targetWidth, opacity: 1, progress });

    useLayoutEffect(() => {
        const shouldSnap = previousValues.current.identity !== identity || previousValues.current.maxProgress !== maxProgress;
        previousValues.current = { identity, maxProgress };

        if (shouldSnap || currentWidth.current === targetWidth) {
            currentWidth.current = targetWidth;
            setAnimation((current) =>
                current.width === targetWidth && current.opacity === 1 && current.progress === progress
                    ? current
                    : { width: targetWidth, opacity: 1, progress }
            );
            return;
        }

        const startWidth = currentWidth.current;
        let previousTime = performance.now();
        let frame = 0;
        const update = (time: number) => {
            const difference = targetWidth - currentWidth.current;
            const step = Math.max(1, ((time - previousTime) / 32) * Math.round(Math.sqrt(Math.abs(difference))));
            currentWidth.current = difference > 0 ? Math.min(targetWidth, currentWidth.current + step) : Math.max(targetWidth, currentWidth.current - step);
            previousTime = time;
            const isComplete = currentWidth.current === targetWidth;
            setAnimation({
                width: currentWidth.current,
                opacity: isComplete ? 1 : 1 - (targetWidth - currentWidth.current) / (targetWidth - startWidth),
                progress: isComplete ? progress : Math.round((currentWidth.current / width) * maxProgress)
            });
            if (!isComplete) frame = requestAnimationFrame(update);
        };

        update(previousTime);
        return () => cancelAnimationFrame(frame);
    }, [identity, maxProgress, progress, targetWidth, width]);

    const style = {
        '--air-achievement-progress-left': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar1')})`,
        '--air-achievement-progress-track': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar2')})`,
        '--air-achievement-progress-right': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar3')})`,
        '--air-achievement-progress-fill': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar4')})`,
        '--air-achievement-progress-fill-cap': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar5')})`,
        width: width + 10
    } as CSSProperties;

    return (
        <div
            className={`air-achievement-progress ${className}`.trim()}
            style={style}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={maxProgress}
        >
            <span className="air-achievement-progress__left" aria-hidden="true" />
            <span className="air-achievement-progress__track" style={{ width }} aria-hidden="true" />
            <span className="air-achievement-progress__right" style={{ left: width + 4 }} aria-hidden="true" />
            <span className="air-achievement-progress__fill-background" style={{ width: animation.width + 1 }} aria-hidden="true" />
            <span className="air-achievement-progress__fill" style={{ width: animation.width, opacity: animation.opacity }} aria-hidden="true" />
            <span className="air-achievement-progress__fill-cap" style={{ left: animation.width + 4 }} aria-hidden="true" />
            <AchievementText
                bold
                color={0xffffff}
                text={
                    localizationKey
                        ? LocalizeText(
                              localizationKey,
                              ['progress', 'limit'],
                              [String(animation.progress + scoreAtStartOfLevel), String(maxProgress + scoreAtStartOfLevel)]
                          )
                        : `${animation.progress + scoreAtStartOfLevel}/${maxProgress + scoreAtStartOfLevel}`
                }
                height={17}
                width={width}
                x={7}
                y={3}
                align="center"
            />
        </div>
    );
};
