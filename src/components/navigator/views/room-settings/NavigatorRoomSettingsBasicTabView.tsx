import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import {
    GetClubMemberLevel,
    GetMaxVisitorsList,
    GetSelectedMaxVisitors,
    IRoomData,
    LocalizeText
} from '../../../../api';
import removeIconSrc from '../../../../assets/images/navigator/room-settings/remove-icon-bb2200.png';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { useNavigatorData } from '../../../../hooks';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';
import { RoomSettingsFieldError, RoomSettingsFieldErrorView } from './RoomSettingsFieldErrorView';

const ROOM_NAME_MIN_LENGTH = 3;
const ROOM_NAME_MAX_LENGTH = 60;
const DESC_MAX_LENGTH = 255;
const TAGS_MAX_LENGTH = 30;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    isEnteredRoom?: boolean;
    handleChange: (field: string, value: string | number | boolean | string[]) => void;
    fieldError?: RoomSettingsFieldError;
    overlayNode?: HTMLElement;
    onFieldError: (error: RoomSettingsFieldError) => void;
    onDelete: () => void;
}

export const NavigatorRoomSettingsBasicTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, isEnteredRoom = true, handleChange = null, fieldError = null, overlayNode = null, onFieldError = null, onDelete = null } = props;
    const [roomName, setRoomName] = useState<string>('');
    const [roomDescription, setRoomDescription] = useState<string>('');
    const [roomTag1, setRoomTag1] = useState<string>('');
    const [roomTag2, setRoomTag2] = useState<string>('');
    const { categories } = useNavigatorData();
    // _r2ec56e547f022d: a safety-locked account keeps the delete link but it is dimmed and dead.
    const isSafetyLocked = GetSessionDataManager().isSafetyLocked;
    const visitorOptions = GetMaxVisitorsList(GetClubMemberLevel() > 0, roomData.userCount);
    const selectedVisitors = GetSelectedMaxVisitors(visitorOptions, roomData.userCount);
    const selectedVisitorIndex = roomData.userCount > visitorOptions[visitorOptions.length - 1]
        ? visitorOptions.length - 1
        : visitorOptions.indexOf(selectedVisitors);

    const saveRoomName = (value = roomName) => {
        if (value.length < ROOM_NAME_MIN_LENGTH) {
            onFieldError({ field: 'name', message: LocalizeText('navigator.roomsettings.roomnameismandatory') });
            return;
        }

        if (value === roomData.roomName || value.length > ROOM_NAME_MAX_LENGTH) return;

        handleChange('name', value);
    };

    const saveRoomDescription = (value = roomDescription) => {
        if (value === roomData.roomDescription || value.length > DESC_MAX_LENGTH) return;

        handleChange('description', value);
    };

    const saveTags = (index: number) => {
        if (index === 0 && roomTag1 === roomData.tags[0]) return;

        if (index === 1 && roomTag2 === roomData.tags[1]) return;

        const tag = index === 0 ? roomTag1 : roomTag2;

        if (tag.length > TAGS_MAX_LENGTH) {
            onFieldError({ field: 'tags', message: LocalizeText('navigator.roomsettings.toomanycharacters'), tagText: tag.toLowerCase() });
            return;
        }

        if (roomTag1 === '' && roomTag2 !== '') setRoomTag2('');

        handleChange('tags', roomTag1 === '' && roomTag2 !== '' ? [roomTag2] : [roomTag1, roomTag2]);
    };

    useEffect(() => {
        setRoomName(roomData.roomName);
        setRoomDescription(roomData.roomDescription);
        setRoomTag1(roomData.tags.length > 0 && roomData.tags[0] ? roomData.tags[0] : '');
        setRoomTag2(roomData.tags.length > 0 && roomData.tags[1] ? roomData.tags[1] : '');
    }, [roomData]);

    const tagHasError = (tag: string) => fieldError?.field === 'tags' && tag !== '' && tag.toLowerCase() === fieldError.tagText;

    return (
        <>
            <div className="ros-tab" style={{ height: 360 }}>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={119} x={0} y={-3}>
                    {LocalizeText('navigator.roomname')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={20} w={300} x={0} y={14}>
                    <input
                        className={`ros-input${fieldError?.field === 'name' ? ' is-invalid' : ''}`}
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
                        className={`ros-input ros-textarea${fieldError?.field === 'description' ? ' is-invalid' : ''}`}
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
                    <HabboDropMenuView
                        label={LocalizeText('navigator.category')}
                        value={roomData.categoryId}
                        options={(categories ?? []).map((category) => ({ value: category.id, label: LocalizeText(category.name) }))}
                        onSelect={(value) => handleChange('category', value)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={125} x={0} y={145}>
                    {LocalizeText('navigator.maxvisitors')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={300} x={0} y={161}>
                    <HabboDropMenuView
                        label={LocalizeText('navigator.maxvisitors')}
                        value={selectedVisitorIndex}
                        options={visitorOptions.map((value, index) => ({ value: index, label: String(value) }))}
                        onSelect={(index) => handleChange('max_visitors', visitorOptions[index])}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={138} x={0} y={190}>
                    {LocalizeText('navigator.tradesettings')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={300} x={0} y={206}>
                    <HabboDropMenuView
                        label={LocalizeText('navigator.tradesettings')}
                        value={roomData.tradeState}
                        options={[
                            { value: 0, label: LocalizeText('navigator.roomsettings.trade_not_allowed') },
                            { value: 1, label: LocalizeText('navigator.roomsettings.trade_not_with_Controller') },
                            { value: 2, label: LocalizeText('navigator.roomsettings.trade_allowed') }
                        ]}
                        onSelect={(value) => handleChange('trade_state', value)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={86} x={0} y={238}>
                    {LocalizeText('navigator.tags')}
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={15} w={145} x={0} y={254}>
                    <input
                        className={`ros-input${tagHasError(roomTag1) ? ' is-invalid' : ''}`}
                        value={roomTag1 ? `#${roomTag1}` : ''}
                        onChange={(event) => setRoomTag1(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(0)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={15} w={145} x={149} y={254}>
                    <input
                        className={`ros-input${tagHasError(roomTag2) ? ' is-invalid' : ''}`}
                        value={roomTag2 ? `#${roomTag2}` : ''}
                        onChange={(event) => setRoomTag2(event.target.value.replace(/^#/, ''))}
                        onBlur={() => saveTags(1)}
                    />
                </NavigatorRoomSettingsAtView>
                {fieldError?.field === 'name' && <RoomSettingsFieldErrorView h={20} message={fieldError.message} overlayNode={overlayNode} w={300} x={0} y={14} />}
                {fieldError?.field === 'description' && <RoomSettingsFieldErrorView h={39} message={fieldError.message} overlayNode={overlayNode} w={300} x={0} y={51} />}
                {tagHasError(roomTag1) && <RoomSettingsFieldErrorView h={15} message={fieldError.message} overlayNode={overlayNode} w={145} x={0} y={254} />}
                {tagHasError(roomTag2) && <RoomSettingsFieldErrorView h={15} message={fieldError.message} overlayNode={overlayNode} w={145} x={149} y={254} />}
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
                        <NavigatorRoomSettingsAtView className={isSafetyLocked ? 'ros-disabled' : ''} h={18} w={174} x={59} y={339}>
                            <button type="button" className="ros-link ros-remove-link" disabled={isSafetyLocked} onClick={onDelete}>
                                <span><img className="ros-remove-icon" src={removeIconSrc} alt="" />{LocalizeText('navigator.roomsettings.delete')}</span>
                            </button>
                        </NavigatorRoomSettingsAtView>
                    </>
                )}
            </div>
        </>
    );
};
