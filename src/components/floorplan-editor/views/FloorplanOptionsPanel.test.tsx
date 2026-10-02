import { AvatarScaleType, GetAvatarRenderManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../state/reducer';
import { FloorplanOptionsPanel } from './FloorplanOptionsPanel';

const avatarManager = GetAvatarRenderManager as ReturnType<typeof vi.fn>;
const initialAvatarManager = avatarManager.getMockImplementation();

describe('FloorplanOptionsPanel', () => {
    afterEach(() => {
        cleanup();
        if (initialAvatarManager) avatarManager.mockImplementation(initialAvatarManager);
    });
    it('the ghost avatar does not rotate the entry direction', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 2 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('entry-dir'));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('wraps from 7 back to 0', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 7 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('entry-dir-prev'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DOOR_DIR', dir: 0, source: 'local' });
    });

    it('the left arrow increments direction and the right arrow decrements it', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 2 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('entry-dir-prev'));
        fireEvent.click(getByTestId('entry-dir-next'));
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SET_DOOR_DIR', dir: 3, source: 'local' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_DOOR_DIR', dir: 1, source: 'local' });
    });

    it('wall and floor menus dispatch the selected thickness index', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, thickness: { wall: 2 as const, floor: 1 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.change(getByTestId('wall-thickness'), { target: { value: '3' } });
        fireEvent.change(getByTestId('floor-thickness'), { target: { value: '0' } });
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SET_THICKNESS', wall: 3, source: 'local' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_THICKNESS', floor: 0, source: 'local' });
        expect(getByTestId('floorplan-ghost').getAttribute('data-figure')).toBe('hd-180-1.ch-210-66.lg-270-82.sh-290-81');
        expect(getByTestId('floorplan-ghost').getAttribute('data-scale')).toBe('sh');
        expect(getByTestId('floorplan-ghost').getAttribute('data-direction')).toBe('2');
    });

    it('draws the ghost from the library callback and skips the placeholder', () => {
        const dispose = vi.fn();
        let listener: { resetFigure: (figure: string) => void } | null = null;
        let calls = 0;

        avatarManager.mockImplementation(() => ({
            createAvatarImage: (_figure: string, scale: string, _gender: string, next: { resetFigure: (figure: string) => void }) => {
                expect(scale).toBe(AvatarScaleType.SMALL);
                calls += 1;
                listener = next;

                if (calls === 1) {

                    return {
                        setDirection: vi.fn(),
                        processAsImageUrl: () => 'placeholder://ghost',
                        isPlaceholder: () => true,
                        dispose
                    };
                }

                return {
                    setDirection: vi.fn(),
                    processAsImageUrl: () => 'blob:ghost',
                    isPlaceholder: () => false,
                    dispose
                };
            }
        }));

        const state = { ...initialState, door: { x: 0, y: 0, dir: 2 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={() => {}} />);

        expect(getByTestId('floorplan-ghost').querySelector('img')).toBeNull();
        expect(listener).toBeTruthy();

        act(() => listener?.resetFigure('hd-180-1.ch-210-66.lg-270-82.sh-290-81'));

        expect(getByTestId('floorplan-ghost').querySelector('img')?.getAttribute('src')).toBe('blob:ghost');
        expect(dispose).toHaveBeenCalled();
    });
});
