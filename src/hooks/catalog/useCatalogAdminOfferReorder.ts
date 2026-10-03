import type { ICatalogPage } from '../../api/catalog/ICatalogPage';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { useCatalogUiState } from './useCatalog';
import { replaceCatalogPageOffers } from './useCatalog.helpers';

/**
 * Moves one offer of the open catalog page to another position. The new order is shown at
 * once and sent to the server; a refused or failed reorder reloads the page.
 */
export const useCatalogAdminOfferReorder = () => {
    const admin = useCatalogAdmin();
    const { setCurrentPage } = useCatalogUiState();

    return (page: ICatalogPage | null, fromIndex: number, toIndex: number, pageName: string) => {
        const offers = page?.offers ?? [];
        if (!admin || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= offers.length || toIndex >= offers.length) return;

        const reordered = [...offers];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        const sent = admin.reorderOffers(
            reordered.map((offer, index) => ({ id: offer.offerId, orderNumber: index })),
            pageName
        );

        if (sent) setCurrentPage(replaceCatalogPageOffers(page, reordered));
    };
};
