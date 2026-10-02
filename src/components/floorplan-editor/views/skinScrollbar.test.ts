import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { FloorplanSkinScrollbar } from './FloorplanSkinScrollbar';
import { SCROLL_STEP, scrollFromThumb, scrollMetrics } from './skinScrollbar';

describe('style-3 scrollbar geometry', () => {
    it('sizes the thumb from the viewport and steps arrows by 15', () => {
        const fitted = scrollMetrics(304, 200, 304, 0);

        expect(fitted.track).toBe(272);
        expect(fitted.maxScroll).toBe(0);
        expect(fitted.thumb).toBe(272);
        expect(fitted.thumbPos).toBe(0);

        const metrics = scrollMetrics(304, 600, 300, 0);

        expect(metrics.track).toBe(272);
        expect(metrics.thumb).toBe(136);
        expect(metrics.thumbPos).toBe(0);
        expect(scrollMetrics(304, 600, 300, 300).thumbPos).toBe(136);
        expect(scrollMetrics(304, 10000, 300, 0).thumb).toBe(12);
        expect(SCROLL_STEP).toBe(15);
        expect(scrollFromThumb(136, metrics.track, metrics.thumb, metrics.maxScroll)).toBe(300);
    });

    it('updates arrows and thumb when the painted bitmap grows and shrinks', async () => {
        const scroller = document.createElement('div');
        const canvas = document.createElement('canvas');
        scroller.append(canvas);
        let contentHeight = 200;
        Object.defineProperties(scroller, {
            clientHeight: { value: 304 },
            scrollHeight: { get: () => contentHeight }
        });
        const view = render(createElement(FloorplanSkinScrollbar, {
            scrollerRef: { current: scroller }, axis: 'vertical', slot: 13, testId: 'bar'
        }));
        Object.defineProperty(view.getByTestId('bar'), 'clientHeight', { value: 304 });
        expect(view.getByTestId('bar-increment').dataset.state).toBe('passive');
        contentHeight = 600;
        await act(async () => canvas.setAttribute('height', '600'));
        expect(view.getByTestId('bar-increment').dataset.state).toBe('default');
        expect(view.getByTestId('bar-thumb').style.visibility).toBe('visible');
        fireEvent.pointerDown(view.getByTestId('bar-increment'));
        expect(scroller.scrollTop).toBe(15);
        contentHeight = 200;
        await act(async () => canvas.setAttribute('height', '200'));
        expect(view.getByTestId('bar-increment').dataset.state).toBe('passive');
        expect(view.getByTestId('bar-thumb').style.visibility).toBe('hidden');
        view.unmount();
    });
});
