import { GetSessionDataManager } from '@volt/renderer';
import { FC } from 'react';
import { getLandingBackdrop } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { LandingBackdropView } from './LandingBackdropView';

export const HotelView: FC = () => (
    <div className="volt-hotel-view block fixed w-full h-[calc(100%-55px)] overflow-hidden">
        <LandingBackdropView backdrop={getLandingBackdrop()} />
        <LayoutAvatarImageView classNames={['hotelview-avatar']} figure={GetSessionDataManager().figure} gender={GetSessionDataManager().gender} direction={2} />
    </div>
);
