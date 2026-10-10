import { AchievementData } from '@volt/renderer';
import { CSSProperties, FC, useState } from 'react';
import { ClassicScrollAreaView } from '../../../common';
import { useAchievementListScrollStore } from '../achievementListScrollStore';
import { useAirScrollInput } from '../useAirScrollInput';
import { AchievementListItemView } from './AchievementListItemView';

const WHEEL_STEP = 75;
// The same step serves keyboard activation of the arrow buttons and the thumb's ArrowUp/ArrowDown,
// which ClassicScrollAreaView handles with its scrollStep.
const ARROW_STEP = 15;

const rememberScroll = (scrollTop: number) => useAchievementListScrollStore.setState({ scrollTop });

interface AchievementListViewProps {
    achievements: AchievementData[];
    isScrollable: boolean;
}

export const AchievementListView: FC<AchievementListViewProps> = (props) => {
    const { achievements = [], isScrollable } = props;
    const [viewport, setViewport] = useState<HTMLDivElement>(null);
    const [initialScrollTop] = useState(() => useAchievementListScrollStore.getState().scrollTop);
    const itemCount = Math.max(isScrollable ? 10 : 12, achievements.length);

    useAirScrollInput(viewport, {
        wheelStep: WHEEL_STEP,
        arrowStep: ARROW_STEP,
        onScroll: rememberScroll,
        initialScrollTop
    });

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
                <ClassicScrollAreaView className="air-achievements-scroll-area air-style3-scroll-area" scrollStep={ARROW_STEP} viewportRef={setViewport}>
                    {grid}
                </ClassicScrollAreaView>
            ) : (
                grid
            )}
        </div>
    );
};
