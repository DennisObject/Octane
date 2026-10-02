/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanWallHeightSlider } from './FloorplanWallHeightSlider';

const TRACK_WIDTH = 320;

const stubTrackGeometry = () => {
    const original = HTMLDivElement.prototype.getBoundingClientRect;

    HTMLDivElement.prototype.getBoundingClientRect = function () {
        if (this.getAttribute('data-testid') === 'wall-height-track') {
            return { top: 0, left: 0, right: TRACK_WIDTH, bottom: 30, width: TRACK_WIDTH, height: 30, x: 0, y: 0, toJSON: () => '' };
        }

        return original.call(this);
    };

    return () => {
        HTMLDivElement.prototype.getBoundingClientRect = original;
    };
};

describe('FloorplanWallHeightSlider', () => {
    afterEach(() => cleanup());

    it('shows the current value on the thumb', () => {
        render(<FloorplanWallHeightSlider value={7} onChange={() => undefined} />);

        expect(screen.getByTestId('wall-height-thumb').getAttribute('data-value')).toBe('7');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('7');
    });

    it('the left edge is wall 1 and the right edge is wall 16', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={5} onChange={onChange} />);

        const track = screen.getByTestId('wall-height-track');

        fireEvent.pointerDown(track, { clientX: 0, button: 0 });
        expect(onChange).toHaveBeenLastCalledWith(1);

        fireEvent.pointerDown(track, { clientX: TRACK_WIDTH, button: 0 });
        expect(onChange).toHaveBeenLastCalledWith(16);

        restore();
    });

    it('dragging keeps updating until the pointer is released', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={1} onChange={onChange} />);

        fireEvent.pointerDown(screen.getByTestId('wall-height-track'), { clientX: 0, button: 0 });
        fireEvent.pointerMove(window, { clientX: TRACK_WIDTH / 2 });
        expect(onChange).toHaveBeenLastCalledWith(9);

        fireEvent.pointerUp(window);
        onChange.mockClear();
        fireEvent.pointerMove(window, { clientX: 0 });
        expect(onChange).not.toHaveBeenCalled();

        restore();
    });

    it('does not fire when the picked value equals the current one', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={16} onChange={onChange} />);

        fireEvent.pointerDown(screen.getByTestId('wall-height-track'), { clientX: TRACK_WIDTH, button: 0 });
        expect(onChange).not.toHaveBeenCalled();

        restore();
    });
});
