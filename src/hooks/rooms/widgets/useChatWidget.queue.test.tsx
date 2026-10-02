import { RoomObjectType, RoomSessionChatEvent } from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatWidget } from './useChatWidget';

const mocks = vi.hoisted(() => ({
    handlers: new Map<string, (event: unknown) => unknown>(),
    userData: new Map<number, { type: number; figure: string; name: string; webID: number; roomIndex: number }>(),
    roomSession: { roomId: 42, userDataManager: { getUserDataByIndex: vi.fn() } },
    getRoomObject: vi.fn(),
    getUserImage: vi.fn(),
    getPetImage: vi.fn(),
    format: vi.fn((text: string) => text),
    addChatEntry: vi.fn((_entry: unknown) => 123),
    updateChatEntry: vi.fn(),
    settings: { enabled: false },
    translateIncoming: vi.fn(() => Promise.resolve(null)),
    consumeOutgoingTranslation: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    GetRoomEngine: () => ({ getRoomObject: mocks.getRoomObject }),
    GetSessionDataManager: vi.fn(),
    GetGuestRoomResultEvent: vi.fn(),
    RoomChatSettingsEvent: vi.fn(),
    RoomChatSettings: {},
    RoomSessionChatEvent: { CHAT_EVENT: 'chat', CHAT_TYPE_SPEAK: 1, CHAT_TYPE_WHISPER: 2, CHAT_TYPE_SHOUT: 3 },
    RoomDragEvent: { ROOM_DRAG: 'drag' },
    RoomObjectCategory: { UNIT: 100 },
    RoomObjectType: { USER: 1, PET: 2, BOT: 3, RENTABLE_BOT: 4 },
    RoomObjectVariable: { FIGURE_POSTURE: 'posture' },
    SystemChatStyleEnum: { BOT: 2 },
    RoomUserData: class { constructor(public roomIndex: number) {} },
    PetFigureData: class { typeId = 0; }
}));

vi.mock('../../../api', async () => ({
    ChatBubbleMessage: (await import('../../../api/room/widgets/ChatBubbleMessage')).ChatBubbleMessage,
    ChatBubbleUtilities: {
        getUserImage: mocks.getUserImage,
        getPetImage: mocks.getPetImage,
        AVATAR_COLOR_CACHE: new Map()
    },
    ChatEntryType: { TYPE_CHAT: 1, TYPE_ROOM_INFO: 2 },
    ChatHistoryCurrentDate: () => 'now',
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetRoomObjectScreenLocation: () => ({ x: 100, y: 100 }),
    RoomChatFormatter: mocks.format,
    LocalizeText: (key: string) => key,
    loadEmojiShortcodes: vi.fn(),
    PlaySound: vi.fn()
}));
vi.mock('../../../events', () => ({ SoundboardRoomMessageEvent: { ROOM_MESSAGE: 'soundboard' } }));
vi.mock('../../chat-history', () => ({ useChatHistory: () => ({ addChatEntry: mocks.addChatEntry, updateChatEntry: mocks.updateChatEntry }) }));
vi.mock('../../events', () => ({
    useOctaneEvent: (type: string, handler: (event: unknown) => unknown) => mocks.handlers.set(type, handler),
    useUiEvent: vi.fn(),
    useMessageEvent: vi.fn()
}));
vi.mock('../../session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ userId: 99 }) }));
vi.mock('../../translation', () => ({ useTranslation: () => ({
    settings: mocks.settings,
    translateIncoming: mocks.translateIncoming,
    consumeOutgoingTranslation: mocks.consumeOutgoingTranslation
}) }));
vi.mock('../useRoom', () => ({ useRoom: () => ({ roomSession: mocks.roomSession }) }));

const deferredImage = () => {
    let resolve: (image: string) => void;
    let reject: (error: Error) => void;
    const promise = new Promise<string>((done, fail) => { resolve = done; reject = fail; });

    return { promise, resolve, reject };
};

const send = (id: number, text: string) => {
    const completion = mocks.handlers.get(RoomSessionChatEvent.CHAT_EVENT)({ objectId: id, message: text, chatType: 1, style: 0 });

    // The baseline handler is async. Observe rejections without awaiting a pending image.
    if (completion instanceof Promise) void completion.catch(() => {});
};

let frames: Map<number, FrameRequestCallback>;
const flush = () => act(() => {
    const pending = [...frames.values()];

    frames.clear();
    pending.forEach((callback) => callback(0));
});

describe('room chat queue processing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.handlers.clear();
        mocks.userData.clear();
        mocks.roomSession.roomId = 42;
        mocks.settings.enabled = false;
        mocks.getRoomObject.mockImplementation((_room: number, id: number) => ({ id, model: { getValue: () => 'std' } }));
        mocks.roomSession.userDataManager.getUserDataByIndex.mockImplementation((id: number) => mocks.userData.get(id));
        mocks.getUserImage.mockResolvedValue('user-head');
        mocks.getPetImage.mockResolvedValue('pet-head');
        mocks.format.mockImplementation((text: string) => text);
        mocks.addChatEntry.mockReturnValue(123);
        mocks.translateIncoming.mockResolvedValue(null);
        mocks.consumeOutgoingTranslation.mockReturnValue(null);
        for (const [id, type] of [[1, RoomObjectType.USER], [2, RoomObjectType.BOT], [3, RoomObjectType.PET]]) {
            mocks.userData.set(id, { type, figure: 'figure', name: `User ${id}`, webID: id, roomIndex: id });
        }
        frames = new Map();
        let frameId = 0;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.set(++frameId, callback); return frameId; });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    it.each([1, 3])('shows text and a following bot before sender %i image resolves', async (sender) => {
        const image = deferredImage();
        (sender === 1 ? mocks.getUserImage : mocks.getPetImage).mockReturnValue(image.promise);
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(sender, 'first'); send(2, 'second'); });
        expect(frames.size).toBe(1);
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['first', 'second']);
        expect(result.current.chatMessages[0].imageUrl).toBeNull();
        expect(mocks.addChatEntry).toHaveBeenCalledTimes(sender === 1 ? 1 : 0);
        await act(async () => image.resolve('late-head'));
        expect(result.current.chatMessages[0].imageUrl).toBe('late-head');
        expect(mocks.updateChatEntry.mock.calls).toEqual(sender === 1 ? [[123, { imageUrl: 'late-head' }]] : []);
    });

    it('settles an exception before bubble creation so later chat can flush', async () => {
        mocks.format.mockImplementationOnce(() => { throw new Error('format failed'); });
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(2, 'broken'); send(2, 'later'); });
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['later']);
    });

    it('keeps an already queued line when history throws and still flushes later chat', async () => {
        mocks.addChatEntry.mockImplementationOnce(() => { throw new Error('history failed'); });
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(1, 'first'); send(2, 'later'); });
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['first', 'later']);
    });

    it('skips missing user data without reserving a permanent gap', async () => {
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(999, 'missing'); send(2, 'later'); });
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['later']);
    });

    it('leaves the optional head empty on image rejection', async () => {
        const image = deferredImage();
        mocks.getUserImage.mockReturnValue(image.promise);
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(1, 'first'); send(2, 'later'); });
        flush();
        await act(async () => image.reject(new Error('image failed')));
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['first', 'later']);
        expect(result.current.chatMessages[0].imageUrl).toBeNull();
    });

    it('ignores late heads after room reset', async () => {
        const image = deferredImage();
        mocks.getUserImage.mockReturnValue(image.promise);
        const { result, rerender } = renderHook(() => useChatWidget());
        await act(async () => send(1, 'old'));
        mocks.roomSession.roomId = 43;
        rerender();
        await act(async () => { send(2, 'new'); image.resolve('old-head'); });
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(['new']);
        expect(result.current.chatMessages[0].imageUrl).toBeNull();
        expect(mocks.updateChatEntry).not.toHaveBeenCalled();
    });

    it('ignores a pending head after unmount', async () => {
        const image = deferredImage();
        mocks.getUserImage.mockReturnValue(image.promise);
        const { unmount } = renderHook(() => useChatWidget());
        await act(async () => send(1, 'old'));
        unmount();
        await act(async () => image.resolve('old-head'));
        expect(frames.size).toBe(0);
        expect(mocks.updateChatEntry).not.toHaveBeenCalled();
    });

    it('keeps the newest 250 lines in arrival order in one frame', async () => {
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { for (let i = 0; i < 300; i++) send(2, `${i}`); });
        expect(frames.size).toBe(1);
        flush();
        expect(result.current.chatMessages.map((line) => line.text)).toEqual(Array.from({ length: 250 }, (_, i) => `${i + 50}`));
    });

    it('translates user text and history while its head is pending', async () => {
        const image = deferredImage();
        mocks.getUserImage.mockReturnValue(image.promise);
        mocks.settings.enabled = true;
        mocks.translateIncoming.mockResolvedValue({ originalText: 'hello', translatedText: 'ciao', detectedLanguage: 'en', targetLanguage: 'it' } as never);
        const { result } = renderHook(() => useChatWidget());
        await act(async () => { send(1, 'hello'); send(2, 'later'); });
        flush();
        expect(result.current.chatMessages[0].translatedText).toBe('ciao');
        expect(mocks.addChatEntry.mock.calls[0][0]).toMatchObject({ message: 'hello', imageUrl: null });
        expect(mocks.updateChatEntry).toHaveBeenCalledWith(123, expect.objectContaining({ translatedMessage: 'ciao' }));
        await act(async () => image.resolve('head'));
        expect(result.current.chatMessages[0].translatedText).toBe('ciao');
        expect(mocks.updateChatEntry).toHaveBeenCalledWith(123, { imageUrl: 'head' });
    });
});
