import { FC, SyntheticEvent } from 'react';

// v75 centres a bitmap in the 40x40 thumb by flooring the odd pixel, where flex centring would round it up.
const centerIcon = (event: SyntheticEvent<HTMLImageElement>) =>
{
    const image = event.currentTarget;

    image.style.left = `${Math.floor((40 - image.naturalWidth) / 2)}px`;
    image.style.top = `${Math.floor((40 - image.naturalHeight) / 2)}px`;
};

export const InventoryThumbIconView: FC<{ iconUrl: string }> = ({ iconUrl }) => (
    <div className="volt-inventory-thumb-image">
        <img src={iconUrl} alt="" draggable={false} onLoad={centerIcon} />
    </div>
);
