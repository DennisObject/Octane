import { RoomChatSettings } from '@octane/renderer';
import { FC } from 'react';
import { GetClubMemberLevel, IRoomData, LocalizeText, localizeWithFallback } from '../../../../api';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';
import { RoomSettingsInputErrorView } from './RoomSettingsInputErrorView';

const VIP_CAPTIONS: Record<string, string> = {
    'navigator.roomsettings.room_behavior': 'Room behavior',
    'navigator.roomsettings.do_not_leave_on_door_tile': 'Do not leave room when walking on the door tile',
    'navigator.roomsettings.idle_sleep': 'Sleep after timeout',
    'navigator.roomsettings.idle_autokick': 'Auto-kick after timeout',
    'navigator.roomsettings.timeout.seconds': 'seconds',
    'navigator.roomsettings.chat.flood_sensitivity': 'Flood sensitivity',

    'navigator.roomsettings.idle_sleep_timeout.invalid': 'Sleep timeout must be between 30 seconds and 1 hour',
    'navigator.roomsettings.idle_autokick_timeout.invalid': 'Auto-kick timeout must be between 60 seconds and 10 hours',
    'navigator.roomsettings.idle_autokick_timeout.offset.invalid': 'Auto-kick timeout must be at least 30 seconds higher than sleep timeout'
};

const vipCaption = (key: string) => localizeWithFallback(key, VIP_CAPTIONS[key] ?? key);

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
    handleDraftChange: (field: 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds', value: string) => void;
    idleSleepTimeoutSeconds: string;
    idleAutokickTimeoutSeconds: string;
    inputError: { field: 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds'; key: string };
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null, handleDraftChange, idleSleepTimeoutSeconds, idleAutokickTimeoutSeconds, inputError } = props;
    const isHC = GetClubMemberLevel() > 0;
    const sleepError = inputError?.field === 'idle_sleep_timeout_seconds' && roomData.idleSleepEnabled;
    const autokickError = inputError?.field === 'idle_autokick_timeout_seconds' && roomData.idleAutokickEnabled;

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
                    {vipCaption('navigator.roomsettings.room_behavior')}
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
                    <label htmlFor="ros-door-tile">{vipCaption('navigator.roomsettings.do_not_leave_on_door_tile')}</label>
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
                    <label htmlFor="ros-idle-sleep">{vipCaption('navigator.roomsettings.idle_sleep')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={sleepDim.trim()} h={20} w={50} x={24} y={255}>
                    <input
                        className={`ros-input ros-idle-timeout${sleepError ? ' is-invalid' : ''}`}
                        aria-invalid={!!sleepError}
                        aria-label={`${vipCaption('navigator.roomsettings.idle_sleep')} ${vipCaption('navigator.roomsettings.timeout.seconds')}`}
                        disabled={!isHC || !roomData.idleSleepEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleSleepTimeoutSeconds}
                        onBlur={(event) => handleChange('idle_sleep_timeout_seconds', event.currentTarget.value)}
                        onChange={(event) => handleDraftChange('idle_sleep_timeout_seconds', event.target.value.replace(/\D/g, ''))}
                    />
                    {sleepError && <RoomSettingsInputErrorView message={vipCaption(inputError.key)} />}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${sleepDim}`} h={17} w={231} x={77} y={257}>
                    {vipCaption('navigator.roomsettings.timeout.seconds')}
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
                    <label htmlFor="ros-idle-autokick">{vipCaption('navigator.roomsettings.idle_autokick')}</label>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={kickDim.trim()} h={20} w={50} x={24} y={301}>
                    <input
                        className={`ros-input ros-idle-timeout${autokickError ? ' is-invalid' : ''}`}
                        aria-invalid={!!autokickError}
                        aria-label={`${vipCaption('navigator.roomsettings.idle_autokick')} ${vipCaption('navigator.roomsettings.timeout.seconds')}`}
                        disabled={!isHC || !roomData.idleAutokickEnabled}
                        inputMode="numeric"
                        maxLength={5}
                        value={idleAutokickTimeoutSeconds}
                        onBlur={(event) => handleChange('idle_autokick_timeout_seconds', event.currentTarget.value)}
                        onChange={(event) => handleDraftChange('idle_autokick_timeout_seconds', event.target.value.replace(/\D/g, ''))}
                    />
                    {autokickError && <RoomSettingsInputErrorView message={vipCaption(inputError.key)} />}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className={`ros-text${kickDim}`} h={17} w={231} x={77} y={303}>
                    {vipCaption('navigator.roomsettings.timeout.seconds')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={260} x={0} y={335}>
                    {vipCaption('navigator.roomsettings.chat.flood_sensitivity')}
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
        </>
    );
};
