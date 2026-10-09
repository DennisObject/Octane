import { CSSProperties, FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { ClassicScrollAreaView } from '../../../../../common';
import { CatalogColourVariant } from '../common/catalogColourGrouping.helpers';

interface CatalogColourGridWidgetViewProps {
    variants: CatalogColourVariant[];
    selectedOffer: IPurchasableOffer | null;
    onSelect: (offer: IPurchasableOffer) => void;
}

const toCssColour = (colour: number) => `#${(colour & 0xffffff).toString(16).padStart(6, '0')}`;

/** AIR `colourGridWidget`: one `ctlg_clr_27x22` swatch per colour variant of the selected furni. */
export const CatalogColourGridWidgetView: FC<CatalogColourGridWidgetViewProps> = (props) => {
    const { variants = [], selectedOffer = null, onSelect = null } = props;

    return (
        <div className="octane-catalog-colour-grid-shell">
            <ClassicScrollAreaView className="h-full min-h-0">
                <div aria-label="Colours" className="octane-catalog-colour-grid" role="radiogroup">
                    {variants.map(({ offer, colour }) => {
                        const isChosen = selectedOffer?.offerId === offer.offerId;

                        return (
                            <button
                                key={offer.offerId}
                                aria-checked={isChosen}
                                aria-label={offer.localizationName}
                                className={`octane-catalog-colour-swatch ${isChosen ? 'is-chosen' : ''}`}
                                role="radio"
                                style={{ '--octane-swatch-colour': toCssColour(colour) } as CSSProperties}
                                title={offer.localizationName}
                                type="button"
                                onClick={() => onSelect(offer)}
                            />
                        );
                    })}
                </div>
            </ClassicScrollAreaView>
        </div>
    );
};
