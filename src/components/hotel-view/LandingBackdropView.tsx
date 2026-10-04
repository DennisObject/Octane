import { CSSProperties, FC } from 'react';
import { LandingBackdrop } from '../../api/hotel-view/landingBackdrop';

interface LandingBackdropViewProps {
    backdrop: LandingBackdrop;
}

// The hotel view scenery without its widgets: sky colour and tile, sun, drape
// and the left/right artwork pinned to the bottom corners.
export const LandingBackdropView: FC<LandingBackdropViewProps> = ({ backdrop }) =>
{
    const style: CSSProperties = {
        backgroundColor: backdrop.colour,
        backgroundImage: backdrop.backgroundUrl ? `url("${backdrop.backgroundUrl}")` : undefined
    };

    return (
        <div className="landing-backdrop" style={style} aria-hidden="true">
            {backdrop.sunUrl && <img className="landing-backdrop-sun" src={backdrop.sunUrl} alt="" draggable={false} />}
            {backdrop.rightRepeatUrl && <div className="landing-backdrop-right-repeat" style={{ backgroundImage: `url("${backdrop.rightRepeatUrl}")` }} />}
            {backdrop.leftUrl && <img className="landing-backdrop-left" src={backdrop.leftUrl} alt="" draggable={false} />}
            {backdrop.rightUrl && <img className="landing-backdrop-right" src={backdrop.rightUrl} alt="" draggable={false} />}
            {backdrop.drapeUrl && <img className="landing-backdrop-drape" src={backdrop.drapeUrl} alt="" draggable={false} />}
        </div>
    );
};
