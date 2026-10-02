/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanHeightPicker } from './FloorplanHeightPicker';

const TRACK_WIDTH = 300;

const stubTrackGeometry = () => {
    const original = HTMLDivElement.prototype.getBoundingClientRect;

    HTMLDivElement.prototype.getBoundingClientRect = function () {
        if (this.getAttribute('data-testid') === 'height-track') {
            return {
                top: 0,
                left: 0,
                right: TRACK_WIDTH,
                bottom: 19,
                width: TRACK_WIDTH,
                height: 19,
                x: 0,
                y: 0,
                toJSON: () => ''
            } as DOMRect;
        }

        return original.call(this);
    };

    return () => {
        HTMLDivElement.prototype.getBoundingClientRect = original;
    };
};

describe('FloorplanHeightPicker', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the track + thumb with the current value', () => {
        render(<FloorplanHeightPicker selectedH={12} onSelect={() => undefined} />);

        const thumb = screen.getByTestId('height-thumb');

        expect(thumb).toBeInTheDocument();
        expect(thumb.getAttribute('data-value')).toBe('12');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('12');
    });

    it('the left edge picks height 0 and the right edge picks height 30', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={12} onSelect={onSelect} />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientX: 0, button: 0 });
        expect(onSelect).toHaveBeenLastCalledWith(0);

        fireEvent.pointerDown(track, { clientX: TRACK_WIDTH, button: 0 });
        expect(onSelect).toHaveBeenLastCalledWith(30);

        restore();
    });

    it('clicking the middle uses localX / width * 30', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={0} onSelect={onSelect} />);

        fireEvent.pointerDown(screen.getByTestId('height-track'), { clientX: TRACK_WIDTH / 2, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(15);

        restore();
    });

    it('does not fire onSelect when the picked height equals the current selection', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={30} onSelect={onSelect} />);

        fireEvent.pointerDown(screen.getByTestId('height-track'), { clientX: TRACK_WIDTH, button: 0 });

        expect(onSelect).not.toHaveBeenCalled();

        restore();
    });

    it('thumb fill matches the tile colour at the picked height', () => {
        const { rerender } = render(<FloorplanHeightPicker selectedH={0} onSelect={() => undefined} />);

        const colourAtZero = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        rerender(<FloorplanHeightPicker selectedH={13} onSelect={() => undefined} />);

        const colourAtThirteen = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        expect(colourAtZero).toBeTruthy();
        expect(colourAtThirteen).toBeTruthy();
        expect(colourAtZero).not.toBe(colourAtThirteen);
    });
});
