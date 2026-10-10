import { GetConfiguration } from '@volt/renderer';
import backgroundGradient from '../../assets/images/hotelview/reception/background_gradient_oct26.png';
import backgroundLeft from '../../assets/images/hotelview/reception/background_left_oct26.png';
import backgroundTop from '../../assets/images/hotelview/reception/background_top_oct26.png';
import backgroundRight from '../../assets/images/hotelview/reception/reception_flathotel_backdrop_right.png';

// The artwork behind the hotel view, set with habbo.com's own external variables.
// Without them the hotel view shows the habbo.com reception of October 2026.
export interface LandingBackdrop {
    topUrl: string;
    gradientUrl: string;
    leftUrl: string;
    rightUrl: string;
}

const configuredUrl = (key: string, fallback: string): string =>
{
    const configuration = GetConfiguration();
    const value = configuration.getValue<string>(key, '');

    return value ? configuration.interpolate(value) : fallback;
};

export const getLandingBackdrop = (): LandingBackdrop => ({
    topUrl: configuredUrl('landing.view.background_gradient_top.uri', backgroundTop),
    gradientUrl: configuredUrl('landing.view.background_gradient.uri', backgroundGradient),
    leftUrl: configuredUrl('landing.view.background_left.uri', backgroundLeft),
    rightUrl: configuredUrl('landing.view.background_right.uri', backgroundRight)
});
