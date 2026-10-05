import { RoomChatSettings } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetClubMemberLevel, IRoomData, LocalizeText } from '../../../../api';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
    const [chatDistance, setChatDistance] = useState<number>(0);
    const [idleSleepTimeoutSeconds, setIdleSleepTimeoutSeconds] = useState<string>('');
    const [idleAutokickTimeoutSeconds, setIdleAutokickTimeoutSeconds] = useState<string>('');
    const isHC = GetClubMemberLevel() > 0;
    const minimumAutokickTimeoutSeconds = Math.max(60, (Number(idleSleepTimeoutSeconds) || 30) + 30);

    useEffect(() => {
        setChatDistance(roomData.chatSettings.distance);
        setIdleSleepTimeoutSeconds(roomData.idleSleepTimeoutSeconds ? roomData.idleSleepTimeoutSeconds.toString() : '');
        setIdleAutokickTimeoutSeconds(roomData.idleAutokickTimeoutSeconds ? roomData.idleAutokickTimeoutSeconds.toString() : '');
    }, [roomData.chatSettings, roomData.idleSleepTimeoutSeconds, roomData.idleAutokickTimeoutSeconds]);

    const dim = isHC ? '' : ' ros-disabled';
    const sleepDim = isHC && roomData.idleSleepEnabled ? '' : ' ros-disabled';
    const kickDim = isHC && roomData.idleAutokickEnabled ? '' : ' ros-disabled';

    return (
        <>
            <div className="ros-tab" style={{ height: 395 }}>
                <NavigatorRoomSettingsAtView className="ros-text ros-head" h={19} w={237} x={0} y={3}>
                    {LocalizeText('navigator.roomsettings.vip.caption')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={63} w={310} x={0} y={19}>
                    {LocalizeText('navigator.roomsettings.vip.info')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={206} x={0} y={84}>
                    {LocalizeText('navigator.roomsettings.vip_settings')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={dim.trim()} h={20} w={20} x={0} y={104}>
                    <input
                        id="ros-hide-walls"
                        checked={roomData.hideWalls}
                        className="ros-check"
                        disabled={!isHC}
                        type="checkbox"
                        onChange={(event) => handleChange('hide_walls', event.target.checked)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${dim}`} h={17} w={194} x={20} y={103}>
                    <label htmlFor="ros-hide-walls">{LocalizeText('navigator.roomsettings.hide_walls')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-drop${dim}`} h={24} w={276} x={0} y={125}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.wallThickness}
                        onChange={(event) => handleChange('wall_thickness', event.target.value)}
                    >
                        <option value="-2">{LocalizeText('navigator.roomsettings.wall_thickness.thinnest')}</option>
                        <option value="-1">{LocalizeText('navigator.roomsettings.wall_thickness.thin')}</option>
                        <option value="0">{LocalizeText('navigator.roomsettings.wall_thickness.normal')}</option>
                        <option value="1">{LocalizeText('navigator.roomsettings.wall_thickness.thick')}</option>
                    </select>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-drop${dim}`} h={24} w={276} x={0} y={156}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.floorThickness}
                        onChange={(event) => handleChange('floor_thickness', event.target.value)}
                    >
                        <option value="-2">{LocalizeText('navigator.roomsettings.floor_thickness.thinnest')}</option>
                        <option value="-1">{LocalizeText('navigator.roomsettings.floor_thickness.thin')}</option>
                        <option value="0">{LocalizeText('navigator.roomsettings.floor_thickness.normal')}</option>
                        <option value="1">{LocalizeText('navigator.roomsettings.floor_thickness.thick')}</option>
                    </select>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={221} x={0} y={191}>
                    {LocalizeText('navigator.roomsettings.room_behavior')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={dim.trim()} h={20} w={20} x={0} y={212}>
                    <input
                        id="ros-door-tile"
                        checked={!roomData.leaveOnDoorTileEnabled}
                        className="ros-check"
                        disabled={!isHC}
                        type="checkbox"
                        onChange={(event) => handleChange('leave_on_door_tile_enabled', !event.target.checked)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${dim}`} h={17} w={292} x={20} y={211}>
                    <label htmlFor="ros-door-tile">{LocalizeText('navigator.roomsettings.do_not_leave_on_door_tile')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={dim.trim()} h={20} w={20} x={0} y={234}>
                    <input
                        id="ros-idle-sleep"
                        checked={roomData.idleSleepEnabled}
                        className="ros-check"
                        disabled={!isHC}
                        type="checkbox"
                        onChange={(event) => handleChange('idle_sleep_enabled', event.target.checked)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${dim}`} h={17} w={192} x={20} y={233}>
                    <label htmlFor="ros-idle-sleep">{LocalizeText('navigator.roomsettings.idle_sleep')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={sleepDim.trim()} h={20} w={50} x={24} y={255}>
                    <input
                        className="ros-input"
                        disabled={!isHC || !roomData.idleSleepEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleSleepTimeoutSeconds}
                        onBlur={(event) => {
                            const value = Math.max(30, Math.min(3600, Number(event.currentTarget.value) || 30));
                            const requiredAutokickTimeout = Math.max(60, value + 30);
                            setIdleSleepTimeoutSeconds(value.toString());

                            if (roomData.idleAutokickEnabled && (Number(idleAutokickTimeoutSeconds) || 0) < requiredAutokickTimeout) {
                                setIdleAutokickTimeoutSeconds(requiredAutokickTimeout.toString());
                                handleChange('idle_autokick_timeout_seconds', requiredAutokickTimeout);
                            }

                            handleChange('idle_sleep_timeout_seconds', value);
                        }}
                        onChange={(event) => setIdleSleepTimeoutSeconds(event.target.value.replace(/\D/g, ''))}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${sleepDim}`} h={17} w={231} x={77} y={257}>
                    {LocalizeText('navigator.roomsettings.timeout.seconds')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={dim.trim()} h={20} w={20} x={0} y={280}>
                    <input
                        id="ros-idle-autokick"
                        checked={roomData.idleAutokickEnabled}
                        className="ros-check"
                        disabled={!isHC}
                        type="checkbox"
                        onChange={(event) => handleChange('idle_autokick_enabled', event.target.checked)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${dim}`} h={17} w={210} x={20} y={279}>
                    <label htmlFor="ros-idle-autokick">{LocalizeText('navigator.roomsettings.idle_autokick')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={kickDim.trim()} h={20} w={50} x={24} y={301}>
                    <input
                        className="ros-input"
                        disabled={!isHC || !roomData.idleAutokickEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleAutokickTimeoutSeconds}
                        onBlur={(event) => {
                            const value = Math.max(
                                minimumAutokickTimeoutSeconds,
                                Math.min(36000, Number(event.currentTarget.value) || minimumAutokickTimeoutSeconds)
                            );
                            setIdleAutokickTimeoutSeconds(value.toString());
                            handleChange('idle_autokick_timeout_seconds', value);
                        }}
                        onChange={(event) => setIdleAutokickTimeoutSeconds(event.target.value.replace(/\D/g, ''))}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${kickDim}`} h={17} w={231} x={77} y={303}>
                    {LocalizeText('navigator.roomsettings.timeout.seconds')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={260} x={0} y={335}>
                    {LocalizeText('navigator.roomsettings.chat.flood_sensitivity')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-drop${dim}`} h={24} w={276} x={0} y={358}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.chatSettings.protection}
                        onChange={(event) => handleChange('flood_protection', event.target.value)}
                    >
                        <option value={RoomChatSettings.FLOOD_FILTER_STRICT}>{LocalizeText('navigator.roomsettings.chat.flood.strict')}</option>
                        <option value={RoomChatSettings.FLOOD_FILTER_NORMAL}>{LocalizeText('navigator.roomsettings.chat.flood.normal')}</option>
                        <option value={RoomChatSettings.FLOOD_FILTER_LOOSE}>{LocalizeText('navigator.roomsettings.chat.flood.loose')}</option>
                    </select>
                </NavigatorRoomSettingsAtView>
            </div>
            {/* Polaris-only chat bubble controls; the reference only has the flood filter. */}
            <div className="ros-extra">
                <div className="ros-extra-title">{LocalizeText('navigator.roomsettings.chat_settings')}</div>
                <div className="ros-extra-info">{LocalizeText('navigator.roomsettings.chat_settings.info')}</div>
                <div className={`ros-extra-select ros-drop${dim}`}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.chatSettings.mode}
                        onChange={(event) => handleChange('bubble_mode', event.target.value)}
                    >
                        <option value={RoomChatSettings.CHAT_MODE_FREE_FLOW}>{LocalizeText('navigator.roomsettings.chat.mode.free.flow')}</option>
                        <option value={RoomChatSettings.CHAT_MODE_LINE_BY_LINE}>{LocalizeText('navigator.roomsettings.chat.mode.line.by.line')}</option>
                    </select>
                </div>
                <div className={`ros-extra-select ros-drop${dim}`}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.chatSettings.weight}
                        onChange={(event) => handleChange('chat_weight', event.target.value)}
                    >
                        <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.normal')}</option>
                        <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.thin')}</option>
                        <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.wide')}</option>
                    </select>
                </div>
                <div className={`ros-extra-select ros-drop${dim}`}>
                    <select
                        className="ros-select"
                        disabled={!isHC}
                        value={roomData.chatSettings.speed}
                        onChange={(event) => handleChange('bubble_speed', event.target.value)}
                    >
                        <option value={RoomChatSettings.CHAT_SCROLL_SPEED_FAST}>{LocalizeText('navigator.roomsettings.chat.speed.fast')}</option>
                        <option value={RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL}>{LocalizeText('navigator.roomsettings.chat.speed.normal')}</option>
                        <option value={RoomChatSettings.CHAT_SCROLL_SPEED_SLOW}>{LocalizeText('navigator.roomsettings.chat.speed.slow')}</option>
                    </select>
                </div>
                <div className="ros-extra-info">{LocalizeText('navigator.roomsettings.chat_settings.hearing.distance')}</div>
                <div className={`ros-extra-input${dim}`}>
                    <input
                        className="ros-input"
                        disabled={!isHC}
                        min="0"
                        type="number"
                        value={chatDistance}
                        onBlur={(event) => handleChange('chat_distance', chatDistance)}
                        onChange={(event) => setChatDistance(event.target.valueAsNumber)}
                    />
                </div>
            </div>
        </>
    );
};
