import { FC } from 'react';
import { AvatarInfoUser, LocalizeText } from '../../../../../api';
import { LayoutBadgeImageView, Text } from '../../../../../common';
import { InfoStandAvatarView } from './InfoStandAvatarView';
import { InfoStandHeaderView } from './InfoStandHeaderView';

interface InfoStandWidgetBotViewProps {
    avatarInfo: AvatarInfoUser;
    onClose: () => void;
}

// v75 bot_view: the user_view list without home icon, group badge slot, pen or score; the motto sits in the grey_bg box without the pen.
export const InfoStandWidgetBotView: FC<InfoStandWidgetBotViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;

    if (!avatarInfo) return null;

    return (
        <div className="volt-infostand pointer-events-auto z-30">
            <InfoStandHeaderView name={avatarInfo.name} onClose={onClose} />
            <div className="volt-infostand__rule" />
            <div className="volt-infostand__figure-row">
                <div className="volt-infostand__avatar-well">
                    <InfoStandAvatarView direction={4} figure={avatarInfo.figure} top={24} />
                </div>
                <div className="volt-infostand__badges">
                    {[0, 'group', 1, 2, 3, 4].map((slot) => (
                        <div key={slot} className="volt-infostand__badge-slot flex items-center justify-center relative h-[42px] w-[42px]">
                            {typeof slot === 'number' && avatarInfo.badges[slot] && <LayoutBadgeImageView badgeCode={avatarInfo.badges[slot]} showInfo={true} />}
                        </div>
                    ))}
                </div>
            </div>
            <div className="volt-infostand__rule" />
            <div className="volt-infostand__motto volt-infostand__motto--box volt-infostand__motto--plain">
                <Text fullWidth textBreak wrap className="volt-infostand__motto-text" variant="white">
                    {avatarInfo.motto}
                </Text>
            </div>
            {avatarInfo.carryItem > 0 && (
                <>
                    <div className="volt-infostand__rule" />
                    <div className="volt-infostand__carry">{LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}</div>
                </>
            )}
        </div>
    );
};
