import { AchievementData } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { ClassicScrollAreaView } from '../../../common';
import { useAchievementListScrollStore } from '../achievementListScrollStore';
import { AchievementListItemView } from './AchievementListItemView';

// The AIR scroll area moves a fixed distance per wheel event, whatever the wheel delta is.
const WHEEL_STEP = 75;
// The arrow buttons scroll on press, not on release.
const ARROW_STEP = 15;

const restoreScroll = (viewport: HTMLElement) => {
    viewport.scrollTop = useAchievementListScrollStore.getState().scrollTop;
};

interface AchievementListViewProps {
    achievements: AchievementData[];
    isScrollable: boolean;
}

export const AchievementListView: FC<AchievementListViewProps> = (props) => {
    const { achievements = [], isScrollable } = props;
    const [viewport, setViewport] = useState<HTMLDivElement>(null);
    const itemCount = Math.max(isScrollable ? 10 : 12, achievements.length);

    useEffect(() => {
        if (!viewport) return;

        const onWheel = (event: WheelEvent) => {
            if (!event.deltaY) return;

            event.preventDefault();
            viewport.scrollBy({ top: Math.sign(event.deltaY) * WHEEL_STEP, behavior: 'auto' });
        };

        const arrows = [...viewport.parentElement.querySelectorAll<HTMLButtonElement>('.octane-classic-scrollbar-button')];
        const onArrowDown = (event: PointerEvent) => {
            const isUp = (event.currentTarget as HTMLElement).classList.contains('is-up');

            viewport.scrollBy({ top: isUp ? -ARROW_STEP : ARROW_STEP, behavior: 'auto' });
        };
        const onScroll = () => useAchievementListScrollStore.setState({ scrollTop: viewport.scrollTop });

        restoreScroll(viewport);
        viewport.addEventListener('wheel', onWheel, { passive: false });
        viewport.addEventListener('scroll', onScroll);
        arrows.forEach((arrow) => arrow.addEventListener('pointerdown', onArrowDown));

        return () => {
            arrows.forEach((arrow) => arrow.removeEventListener('pointerdown', onArrowDown));
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('scroll', onScroll);
        };
    }, [viewport]);

    const grid = (
        <div className="air-achievements-list-grid" style={{ '--air-achievement-columns': isScrollable ? 5 : 6 } as CSSProperties}>
            {Array.from({ length: itemCount }, (_, index) => {
                const achievement = achievements?.[index] ?? null;

                return <AchievementListItemView key={achievement?.achievementId ?? `empty-${index}`} achievement={achievement} />;
            })}
        </div>
    );

    return (
        <div className={`air-achievements-list${isScrollable ? ' is-scrollable' : ''}`}>
            <svg className="air-achievements-color-filters" width="0" height="0" aria-hidden="true">
                <filter id="air-achievement-unseen-tint" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="0.768627451 0 0 0 0  0 1 0 0 0  0 0 0.498039216 0 0  0 0 0 1 0" />
                </filter>
            </svg>
            {isScrollable ? (
                <ClassicScrollAreaView className="air-achievements-scroll-area" scrollStep={0} viewportRef={setViewport}>
                    {grid}
                </ClassicScrollAreaView>
            ) : (
                grid
            )}
        </div>
    );
};
