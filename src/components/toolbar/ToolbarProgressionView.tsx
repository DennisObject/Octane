import { Dispatch, FC, SetStateAction, useEffect, useRef } from 'react';
import { CreateLinkEvent } from '@volt/renderer';
import { GetConfigurationValue, localizeWithFallback } from '../../api';
import { Flex, LayoutItemCountView } from '../../common';

interface ToolbarProgressionViewProps {
    achievementCount: number;
    dailyTaskCount: number;
    rewardTrackCount: number;
    setExpanded: Dispatch<SetStateAction<boolean>>;
}

export const ToolbarProgressionView: FC<ToolbarProgressionViewProps> = ({ achievementCount, dailyTaskCount, rewardTrackCount, setExpanded }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        const onClick = (event: MouseEvent) =>
        {
            if (elementRef.current?.contains(event.target as Node)) return;
            setExpanded(false);
        };
        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);
        return () =>
        {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setExpanded]);

    const open = (link: string) =>
    {
        setExpanded(false);
        CreateLinkEvent(link);
    };

    return (
        <Flex alignItems="center" className="volt-toolbar-me-popup volt-toolbar-progression-popup" gap={2} innerRef={elementRef}>
            {GetConfigurationValue('dailytasks.enabled') && (
                <div className="tbme-item" onClick={() => open('dailytasks/open')}>
                    <span className="icon-me-dailytasks" />
                    <span>{localizeWithFallback('widget.progmenu.dailytasks', 'Daily tasks')}</span>
                    {dailyTaskCount > 0 && <LayoutItemCountView count={dailyTaskCount} />}
                </div>
            )}
            {!GetConfigurationValue('toolbar.hide.quests') && (
                <div className="tbme-item" onClick={() => open('quests/toggle')}>
                    <span className="icon-me-quests" />
                    <span>{localizeWithFallback('widget.progmenu.quests', 'Quests')}</span>
                </div>
            )}
            <div className="tbme-item" onClick={() => open('achievements/toggle')}>
                <span className="volt-icon icon-me-achievements" />
                <span>{localizeWithFallback('widget.progmenu.achievements', 'Achievements')}</span>
                {achievementCount > 0 && <LayoutItemCountView count={achievementCount} />}
            </div>
            <div className="tbme-item" onClick={() => open('badge-leaderboard/show')}>
                <span className="volt-icon icon-progression-leaderboards" />
                <span>{localizeWithFallback('widget.progmenu.leaderboards', 'Leaderboards')}</span>
            </div>
            <div className="tbme-item" onClick={() => open('reward_track/open/introduction')}>
                <span className="icon-me-rewardtrack" />
                <span>{localizeWithFallback('widget.progmenu.introduction', 'Introduction')}</span>
                {rewardTrackCount > 0 && <LayoutItemCountView count={rewardTrackCount} />}
            </div>
        </Flex>
    );
};
