import { FC } from 'react';
import popupArrowDown from '../../../../assets/images/navigator/air/popup-arrow-down.png';

export const RoomSettingsInputErrorView: FC<{ message: string }> = ({ message }) => (
    <div className="ros-input-error" role="alert">
        <div className="ros-input-error-border"><span>{message}</span></div>
        <img className="ros-input-error-arrow" src={popupArrowDown} alt="" width={11} height={11} />
    </div>
);
