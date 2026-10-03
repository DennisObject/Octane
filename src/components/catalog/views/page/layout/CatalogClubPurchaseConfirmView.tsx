import { ClubOfferData } from '@octane/renderer';
import { CSSProperties, FC, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../../api';
import { LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';

interface CatalogClubPurchaseConfirmViewProps {
    offer: ClubOfferData;
    productText: string;
    validUntilText: string;
    onCancel: () => void;
    onConfirm: () => void;
}

// club_buy_confirmation (1836) is 369x210; its frame margins put the content at 3,36, so the frame adds 49px around the content.
const REFERENCE_FRAME_HEIGHT = 210;
const FRAME_CHROME_HEIGHT = 49;
const ACTIONS_HEIGHT = 27;
const TITLE_DEFAULT_HEIGHT = 21;
const DISCLAIMER_DEFAULT_HEIGHT = 17;
const DISCLAIMER_MIN_HEIGHT = 17;

// Floors a measured text field to whole pixels, as the Flash text field does for auto_size.
// The measured element is the auto-height text inside the field, so measuring it cannot feed back into its own size.
const useMeasuredFloorHeight = (ref: RefObject<HTMLElement | null>, active: boolean, minHeight: number, fallbackHeight: number) => {
    const [height, setHeight] = useState(fallbackHeight);

    useLayoutEffect(() => {
        const element = ref.current;

        if (!active || !element) return;

        const measure = () => {
            const measured = Math.floor(element.getBoundingClientRect().height);

            if (measured > 0) setHeight(Math.max(minHeight, measured));
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, active, minHeight]);

    return height;
};

export const CatalogClubPurchaseConfirmView: FC<CatalogClubPurchaseConfirmViewProps> = (props) => {
    const { offer, productText, validUntilText, onCancel, onConfirm } = props;
    const disclaimerEnabled = useMemo(() => GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false), []);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!disclaimerEnabled);
    const showCredits = offer.priceCredits > 0 || offer.priceActivityPoints <= 0;
    const titleTextRef = useRef<HTMLSpanElement>(null);
    const disclaimerTextRef = useRef<HTMLSpanElement>(null);
    const titleHeight = useMeasuredFloorHeight(titleTextRef, true, 0, TITLE_DEFAULT_HEIGHT);
    const disclaimerHeight = useMeasuredFloorHeight(disclaimerTextRef, disclaimerEnabled, DISCLAIMER_MIN_HEIGHT, DISCLAIMER_DEFAULT_HEIGHT);

    // Column: title (auto), 3, date (20), 3, cost row (22), inside a 10px top inset, minimum 60px.
    const productHeight = Math.max(60, 10 + titleHeight + 3 + 20 + 3 + 22);
    const disclaimerY = productHeight + 10;
    const actionsY = productHeight + 10 + (disclaimerEnabled ? disclaimerHeight + 10 : 0);
    const contentHeight = actionsY + ACTIONS_HEIGHT;
    const frameHeight = contentHeight + FRAME_CHROME_HEIGHT;
    // AIR centres the initial dialog once, then retains its origin when text resizes it.
    const initialOffsetTop = useRef((frameHeight - REFERENCE_FRAME_HEIGHT) / 2).current;
    const layoutVars = {
        '--octane-club-confirm-title-height': `${titleHeight}px`,
        '--octane-club-confirm-product-height': `${productHeight}px`,
        '--octane-club-confirm-disclaimer-y': `${disclaimerY}px`,
        '--octane-club-confirm-disclaimer-height': `${disclaimerHeight}px`,
        '--octane-club-confirm-actions-y': `${actionsY}px`,
        '--octane-club-confirm-content-height': `${contentHeight}px`,
        '--octane-club-confirm-frame-height': `${frameHeight}px`
    } as CSSProperties;

    useEffect(() => setDisclaimerAccepted(!disclaimerEnabled), [disclaimerEnabled, offer.offerId]);

    const title = LocalizeText('catalog.club.buy.confirm');

    return (
        <OctaneCardView
            aria-label={title}
            aria-modal="true"
            classNames={['octane-club-purchase-confirm']}
            dragStyle={{ height: frameHeight }}
            frameStyle={3}
            isResizable={false}
            offsetTop={initialOffsetTop}
            role="dialog"
            style={layoutVars}
            theme="primary-slim"
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onCancel} />
            <OctaneCardContentView classNames={['octane-club-purchase-confirm-content']} overflow="hidden">
                <div className="octane-club-purchase-confirm-product">
                    <span aria-hidden="true" className="octane-club-purchase-confirm-icon" />
                    <div className="octane-club-purchase-confirm-copy">
                        <strong className="octane-club-purchase-confirm-title">
                            <span ref={titleTextRef} className="octane-club-purchase-confirm-title-text">
                                {productText}
                            </span>
                        </strong>
                        <span>{validUntilText}</span>
                        <div className="octane-club-purchase-confirm-cost-row">
                            <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                            <span className="octane-club-purchase-confirm-price">
                                {showCredits && (
                                    <span className="octane-club-purchase-confirm-price-part" data-currency-type="-1">
                                        <strong>{offer.priceCredits}</strong>
                                        <LayoutCurrencyIcon type={-1} />
                                    </span>
                                )}
                                {offer.priceActivityPoints > 0 && (
                                    <span className="octane-club-purchase-confirm-price-part" data-currency-type={offer.priceActivityPointsType}>
                                        <strong>{`${offer.priceCredits > 0 ? '+ ' : ''}${offer.priceActivityPoints}`}</strong>
                                        <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {disclaimerEnabled && (
                    <label className="octane-club-purchase-confirm-disclaimer">
                        <input checked={disclaimerAccepted} type="checkbox" onChange={(event) => setDisclaimerAccepted(event.target.checked)} />
                        <span ref={disclaimerTextRef}>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}

                <div className="octane-club-purchase-confirm-actions">
                    <button className="octane-club-purchase-confirm-cancel" type="button" onClick={onCancel}>
                        {LocalizeText('cancel')}
                    </button>
                    <button className="octane-club-purchase-confirm-submit" disabled={!disclaimerAccepted} type="button" onClick={onConfirm}>
                        {LocalizeText('catalog.club.buy.subscribe')}
                    </button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
