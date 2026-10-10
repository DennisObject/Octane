import { FC, useState } from 'react';
import { CreateLinkEvent, ICatalogPage, IPurchasableOffer, LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useCatalogData, useCatalogUiState, useNotificationActions } from '../../../../hooks';
import { getCatalogAdminOfferIconUrl, getEditableFurniProducts } from '../../../../hooks/catalog/catalogAdminForms.helpers';
import { useCatalogAdminUiStore } from '../../../../hooks/catalog/catalogAdminUiStore';
import { useCatalogAdminOfferReorder } from '../../../../hooks/catalog/useCatalogAdminOfferReorder';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogAdminOfferIconView } from './CatalogAdminOfferIconView';
import { CatalogAdminOfferPriceView } from './CatalogAdminOfferPriceView';

const OFFER_DRAG_TYPE = 'application/x-catalog-admin-offer';

interface CatalogAdminOfferListViewProps {
    /** The open catalog page when it is the selected one; offers only exist for the open page. */
    page: ICatalogPage | null;
    pageName: string;
}

const offerName = (offer: IPurchasableOffer) => offer.localizationName || `#${offer.offerId}`;

export const CatalogAdminOfferListView: FC<CatalogAdminOfferListViewProps> = ({ page, pageName }) => {
    const admin = useCatalogAdmin();
    const { currentOffer = null } = useCatalogData();
    const { setCurrentOffer, currentType } = useCatalogUiState();
    const { showConfirm } = useNotificationActions();
    const editOffer = useCatalogAdminUiStore((state) => state.editOffer);
    const createOffer = useCatalogAdminUiStore((state) => state.createOffer);
    const reorder = useCatalogAdminOfferReorder();
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const offers = page?.offers ?? [];
    const busy = admin?.busy ?? false;
    const selectedIndex = offers.findIndex((offer) => offer.offerId === currentOffer?.offerId);
    const selected = selectedIndex >= 0 ? offers[selectedIndex] : null;

    const moveSelected = (offset: -1 | 1) => !busy && reorder(page, selectedIndex, selectedIndex + offset, pageName);

    const confirmDelete = (offer: IPurchasableOffer) => {
        if (busy) return;

        const name = offerName(offer);
        showConfirm(
            LocalizeText('catalog.admin.delete.offer.confirm', ['name'], [name]),
            () => admin?.deleteOffer(offer.offerId, name),
            null,
            LocalizeText('catalog.admin.delete'),
            null,
            LocalizeText('catalog.admin.delete.offer')
        );
    };

    return (
        <StaffSection className="volt-catalog-admin-offers" title={LocalizeText('catalog.admin.offers.count', ['count'], [String(offers.length)])}>
            <div className="volt-staff-list volt-catalog-admin-offer-list" role="listbox" aria-label={LocalizeText('catalog.admin.offers')}>
                {!page && <StaffEmpty>{LocalizeText('catalog.admin.offers.loading')}</StaffEmpty>}
                {page && !offers.length && <StaffEmpty>{LocalizeText('catalog.admin.offers.empty')}</StaffEmpty>}
                {offers.map((offer, index) => (
                    <div
                        key={offer.offerId}
                        aria-selected={offer === selected}
                        className={`volt-staff-list-row is-interactive ${offer === selected ? 'is-selected' : ''} ${dragOverIndex === index ? 'is-drop-target' : ''}`}
                        draggable
                        role="option"
                        tabIndex={0}
                        onClick={() => setCurrentOffer(offer)}
                        onDoubleClick={() => editOffer(offer, page.pageId, currentType)}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDragOver={(event) => {
                            if (!event.dataTransfer.types.includes(OFFER_DRAG_TYPE)) return;
                            event.preventDefault();
                            setDragOverIndex(index);
                        }}
                        onDragStart={(event) => {
                            event.dataTransfer.setData(OFFER_DRAG_TYPE, String(index));
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragOverIndex(null);
                            const fromIndex = Number(event.dataTransfer.getData(OFFER_DRAG_TYPE));
                            if (!busy && Number.isInteger(fromIndex)) reorder(page, fromIndex, index, pageName);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            setCurrentOffer(offer);
                        }}
                    >
                        <span className="volt-catalog-admin-offer-icon-box">
                            <CatalogAdminOfferIconView offer={offer} url={getCatalogAdminOfferIconUrl(offer)} />
                        </span>
                        <span className="volt-catalog-admin-grow" title={offerName(offer)}>
                            {offerName(offer)}
                        </span>
                        <CatalogAdminOfferPriceView credits={offer.priceInCredits} points={offer.priceInActivityPoints} pointsType={offer.activityPointType} />
                    </div>
                ))}
            </div>
            <div className="volt-staff-row volt-catalog-admin-actions">
                <Button disabled={!page} variant="primary" onClick={() => page && createOffer(page.pageId, currentType)}>
                    {LocalizeText('catalog.admin.offer.new')}
                </Button>
                <Button disabled={!selected} variant="secondary" onClick={() => selected && editOffer(selected, page.pageId, currentType)}>
                    {LocalizeText('catalog.admin.offer.edit')}
                </Button>
                <Button disabled={!selected || busy || selectedIndex <= 0} variant="secondary" onClick={() => moveSelected(-1)}>
                    {LocalizeText('catalog.admin.move.up')}
                </Button>
                <Button disabled={!selected || busy || selectedIndex >= offers.length - 1} variant="secondary" onClick={() => moveSelected(1)}>
                    {LocalizeText('catalog.admin.move.down')}
                </Button>
                <Button disabled={!selected || busy} variant="danger" onClick={() => selected && confirmDelete(selected)}>
                    {LocalizeText('catalog.admin.delete')}
                </Button>
            </div>
            {selected && getEditableFurniProducts(selected).length > 0 && (
                <div className="volt-staff-row volt-catalog-admin-actions">
                    {getEditableFurniProducts(selected).map((product, index) => (
                        <Button
                            key={`${product.productType}-${product.productClassId}-${index}`}
                            variant="secondary"
                            onClick={() => CreateLinkEvent(`furni-editor/open/${product.productClassId}`)}
                        >
                            {LocalizeText('catalog.admin.offer.edit.furni', ['name'], [product.furnitureData?.className || `#${product.productClassId}`])}
                        </Button>
                    ))}
                </div>
            )}
        </StaffSection>
    );
};
