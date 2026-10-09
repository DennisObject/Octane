import { AchievementData, GetLocalizationManager } from '@octane/renderer';
import { GetConfigurationValue, GetOptionalConfigurationValue } from '../octane';
import { getQuestingImageUrl } from '../quests/QuestUtilities';
import { LocalizeText } from '../utils/LocalizeText';
import { IAchievementCategory } from './IAchievementCategory';

const achievementImages = import.meta.glob('../../assets/images/achievements/*.png', { eager: true, import: 'default' });

export class AchievementUtilities {
    public static getAchievementCategoryName(category: IAchievementCategory): string {
        return LocalizeText(`quests.${category.code}.name`);
    }

    public static getAchievementBadgeCode(achievement: AchievementData): string {
        if (!achievement) return null;

        let badgeId = achievement.badgeId;

        if (achievement.levelCount > 1 && !achievement.finalLevel) badgeId = GetLocalizationManager().getPreviousLevelBadgeId(badgeId);

        return badgeId;
    }

    public static getAchievementImageUrl(imageName: string): string {
        const bundledImage = achievementImages[`../../assets/images/achievements/${imageName}.png`];
        if (bundledImage) return bundledImage;

        return getQuestingImageUrl(imageName);
    }

    public static hasBundledCategoryImage(category: IAchievementCategory): boolean {
        return !!achievementImages[`../../assets/images/achievements/ach_category_${category.code}.png`];
    }

    public static getAchievementCategoryImageUrl(category: IAchievementCategory, icon: boolean = false): string {
        const imageName = `${icon ? 'achicon_' : 'ach_category_'}${category.code}`;

        return AchievementUtilities.getAchievementImageUrl(imageName);
    }

    public static getAchievementCategoryMaxProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) {
            progress += achievement.levelCount;
        }

        return progress;
    }

    public static getAchievementCategoryProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) progress += achievement.finalLevel ? achievement.level : achievement.level - 1;

        return progress;
    }

    public static getAchievementCategoryTotalUnseen(category: IAchievementCategory): number {
        if (!category) return 0;

        let unseen = 0;

        for (const achievement of category.achievements) achievement.unseen > 0 && unseen++;

        return unseen;
    }

    public static getAchievementHasStarted(achievement: AchievementData): boolean {
        if (!achievement) return false;

        if (achievement.finalLevel || achievement.level - 1 > 0) return true;

        return false;
    }

    public static getAchievementIsIgnored(achievement: AchievementData): boolean {
        if (!achievement) return false;

        const ignored = GetConfigurationValue<string[]>('achievements.unseen.ignored', []);
        const skipped = GetOptionalConfigurationValue<string>('toolbar.unseen_notification.skipped_badge_ids', '').split(',').filter(Boolean);

        return ignored.includes(achievement.badgeId.replace(/[0-9]/g, '')) || skipped.some((code) => achievement.badgeId.includes(code));
    }

    public static getAchievementLevel(achievement: AchievementData): number {
        if (!achievement) return 0;

        if (achievement.finalLevel) return achievement.level;

        return achievement.level - 1;
    }
}
