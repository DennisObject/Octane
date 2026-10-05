import { RoomDataParser } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText } from '../../../../api';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

const PASSWORD_MAX_LENGTH = 30;

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    hasGroup?: boolean;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsAccessTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, hasGroup = false, handleChange = null } = props;
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isTryingPassword, setIsTryingPassword] = useState(false);

    const saveRoomPassword = () => {
        if (!isTryingPassword || password.length <= 0 || confirmPassword.length <= 0 || password !== confirmPassword) return;

        handleChange('password', password);
    };

    useEffect(() => {
        setPassword('');
        setConfirmPassword('');
        setIsTryingPassword(false);
    }, [roomData]);

    const showPassword = isTryingPassword || roomData.lockState === RoomDataParser.PASSWORD_STATE;
    const petsY = 260 + (hasGroup ? 30 : 0);

    return (
        <div className="ros-tab" style={{ height: petsY + 82 }}>
            <NavigatorRoomSettingsAtView className="ros-text ros-head" h={19} w={295} x={0} y={3}>
                {LocalizeText('navigator.roomsettings.roomaccess.caption')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={69} w={310} x={0} y={19}>
                {LocalizeText('navigator.roomsettings.roomaccess.info')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={193} x={0} y={87}>
                {LocalizeText('navigator.roomsettings.doormode')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={80} w={274} x={5} y={105}>
                <label className="ros-radio-row" style={{ top: 0 }}>
                    <input
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.OPEN_STATE && !isTryingPassword}
                        onChange={(event) => handleChange('lock_state', RoomDataParser.OPEN_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.open')}</span>
                </label>
                <label className="ros-radio-row" style={{ top: 20 }}>
                    <input
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.DOORBELL_STATE && !isTryingPassword}
                        onChange={(event) => handleChange('lock_state', RoomDataParser.DOORBELL_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.doorbell')}</span>
                </label>
                <label className="ros-radio-row" style={{ top: 40 }}>
                    <input
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.INVISIBLE_STATE && !isTryingPassword}
                        onChange={(event) => handleChange('lock_state', RoomDataParser.INVISIBLE_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.invisible')}</span>
                </label>
                <label className="ros-radio-row" style={{ top: 60 }}>
                    <input type="radio" name="lockState" checked={showPassword} onChange={(event) => setIsTryingPassword(event.target.checked)} />
                    <span>{LocalizeText('navigator.roomsettings.doormode.password')}</span>
                </label>
            </NavigatorRoomSettingsAtView>
            {showPassword && (
                <>
                    <NavigatorRoomSettingsAtView className="ros-text" h={17} w={189} x={41} y={188}>
                        {LocalizeText('navigator.roomsettings.password')}
                    </NavigatorRoomSettingsAtView>
                    {isTryingPassword && password.length <= 0 && (
                        <NavigatorRoomSettingsAtView className="ros-text ros-bold ros-error" h={17} w={120} x={180} y={188}>
                            {LocalizeText('navigator.roomsettings.passwordismandatory')}
                        </NavigatorRoomSettingsAtView>
                    )}
                    <NavigatorRoomSettingsAtView h={15} w={193} x={42} y={203}>
                        <input
                            type="password"
                            className="ros-input"
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onFocus={(event) => setIsTryingPassword(true)}
                        />
                    </NavigatorRoomSettingsAtView>
                    <NavigatorRoomSettingsAtView className="ros-text" h={17} w={234} x={41} y={220}>
                        {LocalizeText('navigator.roomsettings.passwordconfirm')}
                    </NavigatorRoomSettingsAtView>
                    {isTryingPassword && password.length > 0 && password !== confirmPassword && (
                        <NavigatorRoomSettingsAtView className="ros-text ros-bold ros-error" h={17} w={120} x={180} y={220}>
                            {LocalizeText('navigator.roomsettings.invalidconfirm')}
                        </NavigatorRoomSettingsAtView>
                    )}
                    <NavigatorRoomSettingsAtView h={15} w={193} x={42} y={236}>
                        <input
                            type="password"
                            className="ros-input"
                            maxLength={PASSWORD_MAX_LENGTH}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            onBlur={saveRoomPassword}
                        />
                    </NavigatorRoomSettingsAtView>
                </>
            )}
            {hasGroup && (
                <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={30} w={277} x={0} y={260}>
                    {LocalizeText('navigator.roomsettings.roomaccess.guild.disclaimer')}
                </NavigatorRoomSettingsAtView>
            )}
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={162} x={0} y={petsY}>
                {LocalizeText('navigator.roomsettings.pets')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={20} w={20} x={3} y={petsY + 19}>
                <input
                    id="ros-allow-pets"
                    className="ros-check"
                    type="checkbox"
                    checked={roomData.allowPets}
                    onChange={(event) => handleChange('allow_pets', event.target.checked)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text" h={17} w={191} x={18} y={petsY + 18}>
                <label htmlFor="ros-allow-pets">{LocalizeText('navigator.roomsettings.allowpets')}</label>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={20} w={20} x={3} y={petsY + 39}>
                <input
                    id="ros-allow-food"
                    className="ros-check"
                    type="checkbox"
                    checked={roomData.allowPetsEat}
                    onChange={(event) => handleChange('allow_pets_eat', event.target.checked)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text" h={17} w={245} x={18} y={petsY + 38}>
                <label htmlFor="ros-allow-food">{LocalizeText('navigator.roomsettings.allowfoodconsume')}</label>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={20} w={20} x={3} y={petsY + 59}>
                <input
                    id="ros-mute-pets"
                    className="ros-check"
                    type="checkbox"
                    checked={roomData.muteAllPets}
                    onChange={(event) => handleChange('mute_all_pets', event.target.checked)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text" h={17} w={215} x={18} y={petsY + 58}>
                <label htmlFor="ros-mute-pets">{LocalizeText('navigator.roomsettings.mute_all_pets')}</label>
            </NavigatorRoomSettingsAtView>
        </div>
    );
};
