import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanThicknessMenu } from './FloorplanThicknessMenu';

afterEach(cleanup);

const setup = () => {
    const onChange = vi.fn();
    const view = render(<FloorplanThicknessMenu value={2} onChange={onChange} testId="wall-thickness" labelKeyPrefix="wall" />);
    return { ...view, onChange, control: view.getByRole('combobox') };
};

describe('FloorplanThicknessMenu', () => {
    it('commits a pointer selection and closes the list', () => {
        const { control, getAllByRole, queryByRole, onChange } = setup();
        fireEvent.pointerDown(control, { button: 0 });
        fireEvent.pointerDown(getAllByRole('option')[0], { button: 0 });
        expect(onChange).toHaveBeenCalledWith(0);
        expect(queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(control);
    });

    it('cancels outside and Escape without changing thickness', () => {
        const { control, queryByRole, onChange } = setup();
        fireEvent.keyDown(control, { key: 'Enter' });
        fireEvent.keyDown(control, { key: 'ArrowDown' });
        fireEvent.keyDown(control, { key: 'Escape' });
        expect(queryByRole('listbox')).toBeNull();
        fireEvent.keyDown(control, { key: 'Enter' });
        fireEvent.pointerDown(document.body);
        expect(queryByRole('listbox')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('commits the keyboard highlight, including Home and End', () => {
        const { control, onChange } = setup();
        fireEvent.keyDown(control, { key: 'Home' });
        fireEvent.keyDown(control, { key: 'Enter' });
        fireEvent.keyDown(control, { key: 'End' });
        fireEvent.keyDown(control, { key: 'Enter' });
        expect(onChange.mock.calls).toEqual([[0], [3]]);
    });
});
