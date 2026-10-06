import { AchievementData } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { AchievementUtilities, GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { AchievementBadgeView } from './AchievementBadgeView';
import { AchievementText, useAirFieldWidth } from './AchievementText';
import { AirAchievementProgressBar } from './AirAchievementProgressBar';

// The badge widget doubles the bitmap and places it with an integer cast of the leftover, which truncates toward zero
// (a 50px badge, 100px doubled, sits 7px left of the 85px field, not 8px). CSS centring cannot truncate, so measure the badge.
const BADGE_FIELD = 85;

const useBadgeSize = (badgeCode: string) => {
    const [size, setSize] = useState<{ code: string; width: number; height: number }>(null);

    useEffect(() => {
        if (!badgeCode) return;

        const image = new Image();
        image.onload = () => setSize({ code: badgeCode, width: image.naturalWidth, height: image.naturalHeight });
        image.src = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode);
    }, [badgeCode]);

    return size?.code === badgeCode ? size : null;
};

interface AchievementDetailsViewProps {
    achievement: AchievementData;
}

export const AchievementDetailsView: FC<AchievementDetailsViewProps> = (props) => {
    const { achievement = null } = props;
    const badgeCode = achievement ? AchievementUtilities.getAchievementBadgeCode(achievement) : null;
    const rewardText = achievement ? achievement.levelRewardPoints.toString() : '';
    const badgeSize = useBadgeSize(badgeCode);
    const rewardCaptionWidth = useAirFieldWidth(LocalizeText('achievements.details.reward'));
    const rewardAmountWidth = useAirFieldWidth(rewardText, 12, true);

    if (!achievement) return null;

    const showReward = !achievement.finalLevel && achievement.levelRewardPointType >= 0 && achievement.levelRewardPoints >= 1;
    // The reward icon is the big currency bitmap (19x19 with its drop shadow), not the 15px wallet icon.
    const rewardIcon = ({ [-1]: 'credit', 0: 'ducket', 5: 'diamond' } as Record<number, string>)[achievement.levelRewardPointType];
    const showProgress = achievement.displayMethod !== AchievementData.DISPLAY_METHOD_NEVER_SHOW_PROGRESS && !achievement.finalLevel;

    return (
        <div className="air-achievement-details">
            <div className="air-achievement-details-badge">
                <AchievementBadgeView
                    achievement={achievement}
                    className="air-achievement-details-badge-image"
                    style={
                        badgeSize
                            ? {
                                  left: Math.trunc((BADGE_FIELD - badgeSize.width * 2) / 2),
                                  top: Math.trunc((BADGE_FIELD - badgeSize.height * 2) / 2)
                              }
                            : { visibility: 'hidden' }
                    }
                />
            </div>
            <AchievementText background={0xcccccc} bold height={17} text={LocalizeBadgeName(badgeCode)} x={114} y={18} />
            <AchievementText background={0xcccccc} height={47} maxWidth={238} text={LocalizeBadgeDescription(badgeCode)} x={114} y={34} />
            {showReward && (
                <div className="air-achievement-details-reward">
                    <AchievementText background={0xcccccc} text={LocalizeText('achievements.details.reward')} x={0} y={0} style={{ position: 'relative', width: rewardCaptionWidth }} />
                    <AchievementText background={0xcccccc} bold text={rewardText} x={0} y={0} style={{ position: 'relative', width: rewardAmountWidth }} />
                    {rewardIcon ? (
                        <span className={`air-achievement-details-currency air-achievement-details-currency--${rewardIcon}`} />
                    ) : (
                        <LayoutCurrencyIcon className="air-achievement-details-currency" type={achievement.levelRewardPointType} />
                    )}
                </div>
            )}
            <AchievementText
                background={0xcccccc}
                bold
                text={LocalizeText(
                    'achievements.details.level',
                    ['level', 'limit'],
                    [AchievementUtilities.getAchievementLevel(achievement).toString(), achievement.levelCount.toString()]
                )}
                floorCenter
                height={17}
                width={95}
                x={4}
                y={97}
                align="center"
            />
            {showProgress && (
                <AirAchievementProgressBar
                    className="air-achievement-details-progress"
                    width={180}
                    progress={achievement.currentPoints}
                    maxProgress={achievement.scoreLimit}
                    identity={achievement.achievementId * 10000 + achievement.level}
                    localizationKey="achievements.details.progress"
                    scoreAtStartOfLevel={achievement.scoreAtStartOfLevel}
                />
            )}
        </div>
    );
};
