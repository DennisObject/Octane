import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { AchievementUtilities, LocalizeText } from '../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useAchievements } from '../../hooks';
import { AchievementCategoryView } from './AchievementCategoryView';
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
        <OctaneCardView
            className="octane-achievements-air"
            uniqueKey="achievements"
            frameStyle={3}
            isResizable={false}
            initialPosition={windowPosition}
            onPositionChange={setWindowPosition}
            unconstrainedPosition
            dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
            data-view={selectedCategory ? 'category' : 'categories'}
        >
            <OctaneCardHeaderView headerText={LocalizeText('inventory.achievements')} onCloseClick={close} />
            <div className="air-achievements-content octane-card-content-shell">
                {!selectedCategory && (
                    <>
                        <AchievementsCategoryListView
                            categories={achievementCategories}
                            selectedCategoryCode={selectedCategoryCode}
                            setSelectedCategoryCode={setSelectedCategoryCode}
                        />
                        <div className="air-achievements-category-footer">
                            <AirAchievementProgressBar
                                className="air-achievements-total-progress"
                                width={246}
                                maxProgress={getMaxProgress}
                                progress={getProgress}
                                localizationKey="achievements.categories.totalprogress"
                            />
                            <div className="air-achievements-score">
                                {LocalizeText('achievements.categories.score', ['score'], [achievementScore.toString()])}
                            </div>
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
                            <div className="air-achievements-category-name">{AchievementUtilities.getAchievementCategoryName(selectedCategory)}</div>
                            <div className="air-achievements-category-progress">
                                {LocalizeText(
                                    'achievements.details.categoryprogress',
                                    ['progress', 'limit'],
                                    [selectedCategory.getProgress().toString(), selectedCategory.getMaxProgress().toString()]
                                )}
                            </div>
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
        </OctaneCardView>
    );
};
