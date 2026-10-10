/* @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogItemGridWidgetView } from './CatalogItemGridWidgetView';
import { getVisibleAirGridEntries, layoutAirCatalogOffers } from '../common/catalogAirGrid.helpers';

const state = vi.hoisted(() => ({
    currentPage: { offers: [] as any[], pageId: 1 },
    currentType: 'NORMAL'
}));

vi.mock('../../../../../hooks', async () => {
    const { useScrollWindow } = await import('../../../../../hooks/catalog/useScrollWindow');

    return {
        useCatalogActions: () => ({ selectCatalogOffer: vi.fn(), requestOfferToMover: vi.fn() }),
        useCatalogData: () => ({ currentOffer: null, currentPage: state.currentPage }),
        useCatalogUiState: () => ({ currentType: state.currentType, setCurrentPage: vi.fn() }),
        useInventoryFurni: () => ({ isVisible: false }),
        useScrollWindow
    };
});

vi.mock('../common/CatalogOfferTileView', () => ({
    CatalogOfferTileView: ({ offer }: any) => <div data-testid={`tile-${offer.offerId}`} />
}));

const makeOffer = (offerId: number, priced: boolean) =>
    ({
        offerId,
        priceInCredits: priced ? 10 : 0,
        priceInActivityPoints: 0,
        product: {},
        localizationId: `offer_${offerId}`,
        clubLevel: 0
    }) as any;

const getViewport = (container: HTMLElement) => container.querySelector('.volt-classic-scroll-area-viewport') as HTMLElement;

const getRenderedIndexes = () =>
    Array.from(document.querySelectorAll('[data-air-offer-index]')).map((el) => Number(el.getAttribute('data-air-offer-index')));

describe('CatalogItemGridWidgetView mixed-grid windowing', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        state.currentPage = { offers: [], pageId: 1 };
        state.currentType = 'NORMAL';
    });

    it('mounts only the entries intersecting the measured viewport, and follows scroll', () => {
        const offers = [
            ...Array.from({ length: 60 }, (_, i) => makeOffer(i, false)),
            ...Array.from({ length: 60 }, (_, i) => makeOffer(60 + i, true))
        ];
        state.currentPage = { offers, pageId: 1 };

        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });

        const { container } = render(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        const grid = screen.getByRole('listbox', { name: 'Catalog items' });
        const columnCount = Number(grid.style.getPropertyValue('--volt-air-column-count'));
        const expectedLayout = layoutAirCatalogOffers(offers, columnCount);
        expect(grid.style.height).toBe(`${expectedLayout.height}px`);

        const viewport = getViewport(container);
        Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true });

        act(() => {
            viewport.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });

        const expectedIndexesAtTop = getVisibleAirGridEntries(expectedLayout.entries, 0, 200).map((entry) => entry.index);
        const tiles = document.querySelectorAll('[data-testid^="tile-"]');
        expect(tiles.length).toBe(expectedIndexesAtTop.length);

        const indexesAfterFirstScroll = getRenderedIndexes();
        expect(indexesAfterFirstScroll.length).toBe(tiles.length);
        expect([...indexesAfterFirstScroll].sort((a, b) => a - b)).toEqual(expectedIndexesAtTop.sort((a, b) => a - b));

        viewport.scrollTop = 1500;
        act(() => {
            viewport.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });

        const indexesAfterSecondScroll = getRenderedIndexes();
        const firstIndexAfter = Math.min(...indexesAfterSecondScroll);
        expect(firstIndexAfter).toBeGreaterThan(0);
        expect(grid.style.height).toBe(`${expectedLayout.height}px`);
    });

    it('renders the virtualized grid for a large uniform priced page', () => {
        const offers = Array.from({ length: 120 }, (_, i) => makeOffer(i, true));
        state.currentPage = { offers, pageId: 1 };

        const { container } = render(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        expect(container.querySelector('.volt-catalog-grid-virtual')).not.toBeNull();
    });

    it('resets the window before paint on page change so a shorter page is fully mounted on the same render', () => {
        const longOffers = [
            ...Array.from({ length: 60 }, (_, i) => makeOffer(i, false)),
            ...Array.from({ length: 60 }, (_, i) => makeOffer(60 + i, true))
        ];
        state.currentPage = { offers: longOffers, pageId: 1 };

        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });

        const { container, rerender } = render(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        const viewport = getViewport(container);
        Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true });
        viewport.scrollTop = 1500;
        act(() => {
            viewport.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });

        expect(Math.min(...getRenderedIndexes())).toBeGreaterThan(0);

        const shortOffers = [
            makeOffer(200, false),
            makeOffer(201, false),
            makeOffer(202, false),
            makeOffer(203, true),
            makeOffer(204, true),
            makeOffer(205, true)
        ];
        state.currentPage = { offers: shortOffers, pageId: 2 };

        rerender(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        const renderedTestIds = Array.from(document.querySelectorAll('[data-testid^="tile-"]')).map((el) => el.getAttribute('data-testid'));
        for (const offer of shortOffers) {
            expect(renderedTestIds).toContain(`tile-${offer.offerId}`);
        }
    });

    it('measures the reset window before paint on page change so a taller page mounts its own top, not the previous scroll slice', () => {
        const firstOffers = [
            ...Array.from({ length: 60 }, (_, i) => makeOffer(i, false)),
            ...Array.from({ length: 60 }, (_, i) => makeOffer(60 + i, true))
        ];
        state.currentPage = { offers: firstOffers, pageId: 1 };

        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });

        const { container, rerender } = render(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        const viewport = getViewport(container);
        Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true });
        viewport.scrollTop = 1500;
        act(() => {
            viewport.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });

        expect(Math.min(...getRenderedIndexes())).toBeGreaterThan(0);

        const tallerOffers = [
            ...Array.from({ length: 100 }, (_, i) => makeOffer(300 + i, false)),
            ...Array.from({ length: 100 }, (_, i) => makeOffer(400 + i, true))
        ];
        state.currentPage = { offers: tallerOffers, pageId: 2 };

        rerender(<CatalogItemGridWidgetView className="volt-catalog-grid-density-standard" />);

        const grid = screen.getByRole('listbox', { name: 'Catalog items' });
        const columnCount = Number(grid.style.getPropertyValue('--volt-air-column-count'));
        const newLayout = layoutAirCatalogOffers(tallerOffers, columnCount);
        const expectedTopIndexes = getVisibleAirGridEntries(newLayout.entries, 0, 200)
            .map((entry) => entry.index)
            .sort((a, b) => a - b);

        const mountedIndexes = getRenderedIndexes().sort((a, b) => a - b);
        expect(mountedIndexes).toEqual(expectedTopIndexes);
    });
});
