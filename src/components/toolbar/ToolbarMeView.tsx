import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, RoomObjectCategory } from '@volt/renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';
import { DispatchUiEvent, GetConfigurationValue, GetRoomSession, GetUserProfile, localizeWithFallback } from '../../api';
import { Flex } from '../../common';
import { GuideToolEvent } from '../../events';

export const ToolbarMeView: FC<
    PropsWithChildren<{
        useGuideTool: boolean;
        setMeExpanded: Dispatch<SetStateAction<boolean>>;
    }>
> = (props) =>
{
    const { useGuideTool = false, setMeExpanded = null, children = null } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        const roomSession = GetRoomSession();

        if (!roomSession) return;

        GetRoomEngine().selectRoomObject(roomSession.roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT);
    }, []);

    useEffect(() =>
    {
        const onClick = (event: MouseEvent) =>
        {
            if (elementRef.current && elementRef.current.contains(event.target as Node)) return;

            setMeExpanded(false);
        };

        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);

        return () =>
        {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setMeExpanded]);

    const open = (action: () => void) =>
    {
        setMeExpanded(false);
        action();
    };

    return (
        <Flex alignItems="center" className="volt-toolbar-me-popup" gap={2} innerRef={elementRef}>
            {GetConfigurationValue('guides.enabled') && useGuideTool && (
                <div className="tbme-item" onClick={() => open(() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL)))}>
                    <span className="volt-icon icon-me-helper-tool" />
                    <span>{localizeWithFallback('widget.memenu.guide', 'Helper tool')}</span>
                </div>
            )}
            <div className="tbme-item" onClick={() => open(() => GetUserProfile(GetSessionDataManager().userId))}>
                <span className="volt-icon icon-me-profile" />
                <span>{localizeWithFallback('widget.memenu.profile', 'My profile')}</span>
            </div>
            <div className="tbme-item" onClick={() => open(() => CreateLinkEvent('navigator/search/myworld_view'))}>
                <span className="volt-icon icon-me-rooms" />
                <span>{localizeWithFallback('widget.memenu.myrooms', 'My rooms')}</span>
            </div>
            <div className="tbme-item" onClick={() => open(() => CreateLinkEvent('avatar-editor/show'))}>
                <span className="volt-icon icon-me-clothing" />
                <span>{localizeWithFallback('widget.memenu.editavatar', 'Change looks')}</span>
            </div>
            <div className="tbme-item" onClick={() => open(() => CreateLinkEvent('groupforum/list/my'))}>
                <span className="volt-icon icon-me-forums" />
                <span>{localizeWithFallback('widget.memenu.forums', 'Forums')}</span>
            </div>
            {children}
        </Flex>
    );
};
