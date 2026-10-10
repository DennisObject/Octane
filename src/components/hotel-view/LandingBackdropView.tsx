import { FC } from 'react';
import { LandingBackdrop } from '../../api/hotel-view/landingBackdrop';

interface LandingBackdropViewProps {
    backdrop: LandingBackdrop;
}

// The landing view scenery as AIR lays it out: the top colour fills the sky, the gradient
// spans the width above the bottom edge, and the left and right artwork sit in its corners.
export const LandingBackdropView: FC<LandingBackdropViewProps> = ({ backdrop }) => (
    <div className="landing-backdrop" style={{ backgroundImage: `url("${backdrop.topUrl}")` }} aria-hidden="true">
        <div className="landing-backdrop-gradient" style={{ backgroundImage: `url("${backdrop.gradientUrl}")` }} />
        <img className="landing-backdrop-left" src={backdrop.leftUrl} alt="" draggable={false} />
        <img className="landing-backdrop-right" src={backdrop.rightUrl} alt="" draggable={false} />
    </div>
);
