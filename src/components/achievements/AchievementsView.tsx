import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { AchievementUtilities, LocalizeText } from '../../api';
import { VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useAchievements } from '../../hooks';
import { AchievementCategoryView } from './AchievementCategoryView';
import { AchievementText } from './AchievementText';
import { AirAchievementProgressBar } from './AirAchievementProgressBar';
import { AchievementsCategoryListView } from './category-list';

export const AchievementsView: FC = () => {
    const [windowPosition, setWindowPosition] = useState<{ x: number; y: number } | null>(null);
    const {
        isVisible,
        isLoaded,
        show,
        close,
        achievementCategories = [],
        selectedCategoryCode = null,
        setSelectedCategoryCode = null,
        achievementScore = 0,
        getProgress = 0,
        getMaxProgress = 0,
        selectedCategory = null
    } = useAchievements();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        show(parts[2]);
                        return;
                    case 'hide':
                        close();
                        return;
                    case 'toggle':
                        if (isVisible) close();
                        else show();
                        return;
                }
            },
            eventUrlPrefix: 'achievements/'
        };

        const questTracker: ILinkEventTracker = {
            eventUrlPrefix: 'questengine/achievements',
            linkReceived: (url) => {
                const category = url.split('/')[2];
                if (category) show(category);
                else show();
            }
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(questTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(questTracker);
        };
    }, [close, isVisible, show]);

    useEffect(() => {
        if (!isVisible || !isLoaded || windowPosition) return;

        setWindowPosition({ x: Math.round((window.innerWidth - 389) / 2), y: 20 });
    }, [isLoaded, isVisible, windowPosition]);

    if (!isVisible || !isLoaded || !windowPosition) return null;

    return (
        <VoltCardView
            className="volt-achievements-air"
            uniqueKey="achievements"
            frameStyle={3}
            isResizable={false}
            initialPosition={windowPosition}
            onPositionChange={setWindowPosition}
            unconstrainedPosition
            dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
            data-view={selectedCategory ? 'category' : 'categories'}
        >
            <VoltCardHeaderView headerText="" onCloseClick={close}>
                <NativeText
                    background={0x377998}
                    className="air-achievements-native-title"
                    overrides={{ color: 0xffffff }}
                    text={LocalizeText('inventory.achievements')}
                    textStyle="u_frame_title"
                />
            </VoltCardHeaderView>
            <div className="air-achievements-content volt-card-content-shell">
                {!selectedCategory && (
                    <>
                        <AchievementsCategoryListView
                            categories={achievementCategories}
                            selectedCategoryCode={selectedCategoryCode}
                            setSelectedCategoryCode={setSelectedCategoryCode}
                        />
                        <div className="air-achievements-category-footer">
                            {/* The score field overlaps the last row of the bar by one pixel, so it is drawn first. */}
                            <AchievementText
                                background={0xe9e9e1}
                                bold
                                color={0x444444}
                                size={13}
                                text={LocalizeText('achievements.categories.score', ['score'], [achievementScore.toString()])}
                                floorCenter
                                height={18}
                                width={379}
                                x={5}
                                y={23}
                                align="center"
                            />
                            <AirAchievementProgressBar
                                className="air-achievements-total-progress"
                                width={246}
                                maxProgress={getMaxProgress}
                                progress={getProgress}
                                localizationKey="achievements.categories.totalprogress"
                            />
                        </div>
                    </>
                )}
                {selectedCategory && (
                    <>
                        <div className="air-achievements-category-header">
                            <button
                                type="button"
                                className="air-achievements-back"
                                onClick={() => setSelectedCategoryCode(null)}
                                aria-label={LocalizeText('generic.back')}
                            />
                            <AchievementText background={0x8899a2} bold color={0xffffff} height={22} size={20} text={AchievementUtilities.getAchievementCategoryName(selectedCategory)} x={78} y={13} />
                            <AchievementText
                                background={0x8899a2}
                                bold
                                color={0xffffff}
                                size={13}
                                text={LocalizeText(
                                    'achievements.details.categoryprogress',
                                    ['progress', 'limit'],
                                    [selectedCategory.getProgress().toString(), selectedCategory.getMaxProgress().toString()]
                                )}
                                height={24}
                                x={78}
                                y={40}
                            />
                            <img
                                className="air-achievements-category-icon"
                                src={AchievementUtilities.getAchievementCategoryImageUrl(selectedCategory, true)}
                                onError={(event) => {
                                    event.currentTarget.style.visibility = 'hidden';
                                }}
                                onLoad={(event) => {
                                    event.currentTarget.style.visibility = 'visible';
                                }}
                                alt=""
                                draggable={false}
                            />
                        </div>
                        <AchievementCategoryView category={selectedCategory} />
                    </>
                )}
            </div>
        </VoltCardView>
    );
};
