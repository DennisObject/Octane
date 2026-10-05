import {
    RoomDeleteComposer,
    RoomSettingsSaveErrorEvent,
    RoomSettingsSaveErrorParser
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import {
    CreateLinkEvent,
    GetClubMemberLevel,
    GetMaxVisitorsList,
    GetSelectedMaxVisitors,
    IRoomData,
    LocalizeText,
    SendMessageComposer
} from '../../../../api';
import declineSrc from '../../../../assets/images/navigator/room-settings/decline.png';
import { useMessageEvent, useNavigatorData, useNotification } from '../../../../hooks';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

const ROOM_NAME_MIN_LENGTH = 3;
const ROOM_NAME_MAX_LENGTH = 60;
const DESC_MAX_LENGTH = 255;
const TAGS_MAX_LENGTH = 30;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    isEnteredRoom?: boolean;
    handleChange: (field: string, value: string | number | boolean | string[]) => void;
    onClose: () => void;
}

export const NavigatorRoomSettingsBasicTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, isEnteredRoom = true, handleChange = null, onClose = null } = props;
    const [roomName, setRoomName] = useState<string>('');
    const [roomDescription, setRoomDescription] = useState<string>('');
    const [roomTag1, setRoomTag1] = useState<string>('');
    const [roomTag2, setRoomTag2] = useState<string>('');
    const [tagIndex, setTagIndex] = useState(0);
    const [typeError, setTypeError] = useState<string>('');
    const { showConfirm = null } = useNotification();
    const { categories } = useNavigatorData();
    const visitorOptions = GetMaxVisitorsList(GetClubMemberLevel() > 0, roomData.userCount);
    const selectedVisitors = GetSelectedMaxVisitors(visitorOptions, roomData.userCount);

    useMessageEvent<RoomSettingsSaveErrorEvent>(RoomSettingsSaveErrorEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        switch (parser.code) {
            case RoomSettingsSaveErrorParser.ERROR_INVALID_TAG:
                setTypeError('navigator.roomsettings.unacceptablewords');
                break;
            case RoomSettingsSaveErrorParser.ERROR_NON_USER_CHOOSABLE_TAG:
                setTypeError('navigator.roomsettings.nonuserchoosabletag');
                break;
            default:
                setTypeError('');
                break;
        }
    });

    const deleteRoom = () => {
        showConfirm(
            LocalizeText('navigator.roomsettings.deleteroom.confirm.message', ['room_name'], [roomData.roomName]),
            () => {
                SendMessageComposer(new RoomDeleteComposer(roomData.roomId));

                if (onClose) onClose();

                CreateLinkEvent('navigator/search/myworld_view');
            },
            null,
            null,
            null,
            LocalizeText('navigator.roomsettings.deleteroom.confirm.title')
        );
    };

    const saveRoomName = (value = roomName) => {
        if (value === roomData.roomName || value.length < ROOM_NAME_MIN_LENGTH || value.length > ROOM_NAME_MAX_LENGTH) return;

        handleChange('name', value);
    };

    const saveRoomDescription = (value = roomDescription) => {
        if (value === roomData.roomDescription || value.length > DESC_MAX_LENGTH) return;

        handleChange('description', value);
    };

    const saveTags = (index: number) => {
        if (index === 0 && (roomTag1 === roomData.tags[0] || roomTag1.length > TAGS_MAX_LENGTH)) return;

        if (index === 1 && (roomTag2 === roomData.tags[1] || roomTag2.length > TAGS_MAX_LENGTH)) return;

        if (roomTag1 === '' && roomTag2 !== '') setRoomTag2('');

        setTypeError('');
        setTagIndex(index);
        handleChange('tags', roomTag1 === '' && roomTag2 !== '' ? [roomTag2] : [roomTag1, roomTag2]);
    };

    useEffect(() => {
        setRoomName(roomData.roomName);
        setRoomDescription(roomData.roomDescription);
        setRoomTag1(roomData.tags.length > 0 && roomData.tags[0] ? roomData.tags[0] : '');
        setRoomTag2(roomData.tags.length > 0 && roomData.tags[1] ? roomData.tags[1] : '');
    }, [roomData]);

    const tagError = (index: number): string => {
        const tag = index === 0 ? roomTag1 : roomTag2;

        if (tag.length > TAGS_MAX_LENGTH) return LocalizeText('navigator.roomsettings.toomanycharacters');

        if (tagIndex === index && typeError != '') return LocalizeText(typeError);

        return '';
    };

    return (
        <>
            <div className="ros-tab" style={{ height: 360 }}>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={119} x={0} y={-3}>
                    {LocalizeText('navigator.roomname')}
                </NavigatorRoomSettingsAtView>
                {roomName.length < ROOM_NAME_MIN_LENGTH && (
                    <NavigatorRoomSettingsAtView className="ros-text ros-bold ros-error" h={17} w={175} x={125} y={-3}>
                        {LocalizeText('navigator.roomsettings.roomnameismandatory')}
                    </NavigatorRoomSettingsAtView>
                )}
                <NavigatorRoomSettingsAtView h={20} w={300} x={0} y={14}>
                    <input
                        className="ros-input"
                        value={roomName}
                        maxLength={ROOM_NAME_MAX_LENGTH}
                        onChange={(event) => setRoomName(event.target.value)}
                        onBlur={(event) => saveRoomName(event.currentTarget.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') saveRoomName(event.currentTarget.value);
                        }}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={163} x={0} y={35}>
                    {LocalizeText('navigator.roomsettings.desc')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={39} w={300} x={0} y={51}>
                    <textarea
                        className="ros-input ros-textarea"
                        value={roomDescription}
                        maxLength={DESC_MAX_LENGTH}
                        onChange={(event) => setRoomDescription(event.target.value)}
                        onBlur={(event) => saveRoomDescription(event.currentTarget.value)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={112} x={0} y={100}>
                    {LocalizeText('navigator.category')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={300} x={0} y={116}>
                    <select className="ros-select" value={roomData.categoryId} onChange={(event) => handleChange('category', event.target.value)}>
                        {categories &&
                            categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {LocalizeText(category.name)}
                                </option>
                            ))}
                    </select>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={125} x={0} y={145}>
                    {LocalizeText('navigator.maxvisitors')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={300} x={0} y={161}>
                    <select className="ros-select" value={selectedVisitors} onChange={(event) => handleChange('max_visitors', event.target.value)}>
                        {visitorOptions.map((value, index) => (
                            <option key={`${value}-${index}`} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={138} x={0} y={190}>
                    {LocalizeText('navigator.tradesettings')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={300} x={0} y={206}>
                    <select className="ros-select" value={roomData.tradeState} onChange={(event) => handleChange('trade_state', event.target.value)}>
                        <option value="0">{LocalizeText('navigator.roomsettings.trade_not_allowed')}</option>
                        <option value="1">{LocalizeText('navigator.roomsettings.trade_not_with_Controller')}</option>
                        <option value="2">{LocalizeText('navigator.roomsettings.trade_allowed')}</option>
                    </select>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={86} x={0} y={238}>
                    {LocalizeText('navigator.tags')}
                </NavigatorRoomSettingsAtView>
                {(tagError(0) || tagError(1)) && (
                    <NavigatorRoomSettingsAtView className="ros-text ros-bold ros-error" h={17} w={210} x={90} y={238}>
                        {tagError(0) || tagError(1)}
                    </NavigatorRoomSettingsAtView>
                )}
                <NavigatorRoomSettingsAtView h={15} w={145} x={0} y={254}>
                    <input
                        className="ros-input"
                        value={roomTag1 ? `#${roomTag1}` : ''}
                        onChange={(event) => setRoomTag1(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(0)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={15} w={145} x={149} y={254}>
                    <input
                        className="ros-input"
                        value={roomTag2 ? `#${roomTag2}` : ''}
                        onChange={(event) => setRoomTag2(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(1)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={20} w={20} x={2} y={312}>
                    <input
                        id="ros-allow-walk-through"
                        className="ros-check"
                        type="checkbox"
                        checked={roomData.allowWalkthrough}
                        onChange={(event) => handleChange('allow_walkthrough', event.target.checked)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text" h={17} w={249} x={18} y={311}>
                    <label htmlFor="ros-allow-walk-through">{LocalizeText('navigator.roomsettings.allow_walk_through')}</label>
                </NavigatorRoomSettingsAtView>
                {isEnteredRoom && (
                    <>
                        <NavigatorRoomSettingsAtView h={13} w={13} x={44} y={341}>
                            <span className="ros-decline" style={{ maskImage: `url(${declineSrc})`, WebkitMaskImage: `url(${declineSrc})` }} />
                        </NavigatorRoomSettingsAtView>
                        <NavigatorRoomSettingsAtView h={18} w={180} x={60} y={339}>
                            <button type="button" className="ros-link" onClick={deleteRoom}>
                                {LocalizeText('navigator.roomsettings.delete')}
                            </button>
                        </NavigatorRoomSettingsAtView>
                    </>
                )}
            </div>
        </>
    );
};
