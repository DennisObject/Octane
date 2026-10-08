import { RoomObjectCategory } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds, GetRoomObjectScreenLocation, SnowWarArenaPlayerName, SNOWWAR_ROOM_ID } from '../../../../api';

// AIR UserNameView in game room mode: blend 0.75, fades out over 500 ms once its 500 ms timer completes.
const MAXIMUM_BLEND = 0.75;
const SHOW_TIME = 500;
const FADE_LENGTH = 500;
const TALL_AVATAR_OFFSET = 15;

export const SnowWarArenaPlayerNameView: FC<{ playerName: SnowWarArenaPlayerName; onClose: (objectId: number) => void }> = ({ playerName, onClose }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);
    const [ position, setPosition ] = useState<{ x: number; y: number; blend: number }>(null);

    useEffect(() =>
    {
        return AddAnimationTickerCallback(() =>
        {
            const element = elementRef.current;
            const elapsed = (Date.now() - playerName.shownAt);
            const blend = (elapsed > SHOW_TIME) ? ((1 - ((elapsed - SHOW_TIME) / FADE_LENGTH)) * MAXIMUM_BLEND) : MAXIMUM_BLEND;

            if(blend <= 0)
            {
                onClose(playerName.objectId);

                return;
            }

            const bounds = GetRoomObjectBounds(SNOWWAR_ROOM_ID, playerName.objectId, RoomObjectCategory.UNIT);
            const location = GetRoomObjectScreenLocation(SNOWWAR_ROOM_ID, playerName.objectId, RoomObjectCategory.UNIT);

            if(!element || !bounds || !location)
            {
                onClose(playerName.objectId);

                return;
            }

            const offset = -element.offsetHeight + ((bounds.height > 50) ? TALL_AVATAR_OFFSET : 0);

            setPosition({ x: Math.round(location.x - (element.offsetWidth / 2)), y: Math.round(bounds.top + offset), blend });
        });
    }, [ playerName, onClose ]);

    return (
        <div ref={ elementRef } className="absolute pointer-events-none" style={ { left: position?.x ?? 0, top: position?.y ?? 0, opacity: position?.blend ?? 0 } }>
            <div className="relative min-w-[72px] h-[28px] px-[8px] py-px rounded-[4px] border border-[#050505] text-white text-[11px] font-bold leading-[24px] text-center whitespace-nowrap shadow-[1px_2px_0_rgba(0,0,0,0.58)]" style={ { background: playerName.color } }>
                { playerName.name }
                <div className="absolute bottom-[-6px] left-[calc(50%-6px)] w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px]" style={ { borderTopColor: playerName.color } } />
            </div>
        </div>
    );
};
