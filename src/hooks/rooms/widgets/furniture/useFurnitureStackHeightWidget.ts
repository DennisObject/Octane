import {
    FurnitureAdjacentStackHeightComposer,
    FurnitureStackHeightComposer,
    FurnitureStackHeightEvent,
    GetRoomEngine,
    GetSessionDataManager,
    GetTicker,
    IRoomObject,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    RoomSessionEvent
} from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CanManipulateFurniture, GetRoomSession, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useVoltEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine/useFurniRemovedEvent';

const SLIDER_RANGE = 10;
const SLIDER_SEND_INTERVAL = 30;
const MAX_OPEN_HEIGHT = 80;

const getCurrentStackHeight = (object: IRoomObject): number => {
    const height = object?.getLocation()?.z;
    return height == null || Number.isNaN(height) ? 0 : height;
};

const parseHeight = (value: string): number => {
    const height = Number.parseFloat(value);
    return Number.isNaN(height) ? 0 : height;
};

// Match ActionScript int, including signed 32-bit conversion for large input.
const toWireHeight = (value: string): number => Math.trunc(parseHeight(value) * 100) | 0;

export const useFurnitureStackHeightWidget = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [inputValue, setInputValue] = useState('0');
    const [sliderPosition, setSliderPosition] = useState(0);
    const [isWalkHeightHelper, setIsWalkHeightHelper] = useState(false);
    const [multiWalk, setMultiWalk] = useState(false);
    // Event/timer state must change synchronously: an echo may arrive between
    // a pointer event and React's next render. AIR keeps these same guards.
    const interaction = useRef({
        objectId: -1,
        roomId: -1,
        category: -1,
        inputValue: '0',
        authoritativeHeight: 0,
        lastObjectHeight: 0,
        dirtyInput: false,
        dragging: false,
        dragMoved: false,
        pendingLive: false,
        pendingFinal: false,
        lastSendTime: -SLIDER_SEND_INTERVAL,
        timer: null as ReturnType<typeof setTimeout> | null
    });

    const setCaption = useCallback((value: string) => {
        interaction.current.inputValue = value;
        setInputValue(value);
    }, []);

    const setAltitude = useCallback(
        (height: number) => {
            setCaption(height.toString());
            setSliderPosition(Math.max(0, Math.min(1, height / SLIDER_RANGE)));
        },
        [setCaption]
    );

    const cancelPendingSend = useCallback(() => {
        const state = interaction.current;
        if (state.timer !== null) clearTimeout(state.timer);
        state.timer = null;
        state.pendingLive = false;
        state.pendingFinal = false;
        state.dragging = false;
        state.dragMoved = false;
    }, []);

    const onClose = useCallback(() => {
        cancelPendingSend();
        interaction.current.objectId = -1;
        interaction.current.dirtyInput = false;
        setObjectId(-1);
        setCategory(-1);
    }, [cancelPendingSend]);

    const sendCurrentHeight = () => {
        const state = interaction.current;
        if (state.objectId === -1) return;

        // ActionScript int(value * 100): truncate, never round toFixed(2).
        SendMessageComposer(new FurnitureStackHeightComposer(state.objectId, toWireHeight(state.inputValue)));
    };

    const sendPendingSliderHeight = () => {
        const state = interaction.current;
        state.timer = null;
        if (!state.pendingLive && !state.pendingFinal) return;

        sendCurrentHeight();
        state.lastSendTime = performance.now();
        state.pendingLive = false;
        if (!state.dragging) state.pendingFinal = false;
    };

    const scheduleSliderSend = () => {
        const state = interaction.current;
        const elapsed = performance.now() - state.lastSendTime;
        if (state.timer !== null) clearTimeout(state.timer);
        if (elapsed >= SLIDER_SEND_INTERVAL) {
            sendPendingSliderHeight();
            return;
        }

        state.timer = setTimeout(sendPendingSliderHeight, Math.max(1, SLIDER_SEND_INTERVAL - elapsed));
    };

    const selectSlider = (position: number, action: 'click' | 'drag' | 'double-click') => {
        const state = interaction.current;
        if (action === 'drag' && !state.dragging) return;
        state.dirtyInput = false;
        const precision = action === 'double-click' ? 1 : 100;
        setSliderPosition(position);
        setCaption((Math.trunc(position * SLIDER_RANGE * precision) / precision).toString());

        if (action === 'drag') {
            state.dragMoved = true;
            state.pendingLive = true;
            scheduleSliderSend();
        } else {
            sendCurrentHeight();
            state.lastSendTime = performance.now();
        }
    };

    const beginSliderDrag = () => {
        interaction.current.dragging = true;
        interaction.current.dragMoved = false;
        interaction.current.dirtyInput = false;
    };

    const endSliderDrag = () => {
        const state = interaction.current;
        if (!state.dragging) return;
        state.dragging = false;
        if (!state.dragMoved) return;
        state.pendingFinal = true;
        scheduleSliderSend();
    };

    const changeInput = (value: string) => {
        interaction.current.dirtyInput = true;
        setCaption(value.replace(/[^0123456789.]/g, ''));
    };

    const commitInput = () => {
        cancelPendingSend();
        interaction.current.dirtyInput = false;
        setSliderPosition(Math.max(0, Math.min(1, parseHeight(interaction.current.inputValue) / SLIDER_RANGE)));
        sendCurrentHeight();
    };

    const blurInput = () => {
        const state = interaction.current;
        if (state.dirtyInput) setAltitude(state.authoritativeHeight);
        state.dirtyInput = false;
    };

    const performAction = (action: 'floor' | 'above' | 'up' | 'down') => {
        cancelPendingSend();
        const state = interaction.current;
        state.dirtyInput = false;
        if (state.objectId === -1) return;

        if (action === 'floor') {
            setAltitude(0);
            sendCurrentHeight();
        } else if (action === 'above') {
            SendMessageComposer(new FurnitureStackHeightComposer(state.objectId, -100));
        } else {
            SendMessageComposer(new FurnitureAdjacentStackHeightComposer(state.objectId, action === 'down'));
        }
    };

    const toggleMultiWalk = (checked: boolean) => {
        const state = interaction.current;
        if (state.objectId === -1) return;

        setMultiWalk(checked);
        SendMessageComposer(new FurnitureStackHeightComposer(state.objectId, toWireHeight(state.inputValue), checked));
    };

    const updateAuthoritativeHeight = useCallback(
        (height: number) => {
            const state = interaction.current;
            state.authoritativeHeight = height;
            if (!state.dragging && !state.dirtyInput && !state.pendingLive && !state.pendingFinal) setAltitude(height);
        },
        [setAltitude]
    );

    useMessageEvent<FurnitureStackHeightEvent>(FurnitureStackHeightEvent, (event) => {
        const parser = event.getParser();
        if (interaction.current.objectId !== parser.furniId) return;
        updateAuthoritativeHeight(Number.isNaN(parser.height) ? 0 : parser.height);
    });

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_STACK_HEIGHT, (event) => {
        if (!CanManipulateFurniture(GetRoomSession(), event.objectId, event.category)) return;
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        if (!roomObject) return;

        cancelPendingSend();
        const state = interaction.current;
        const objectHeight = getCurrentStackHeight(roomObject);
        const height = Math.min(objectHeight, MAX_OPEN_HEIGHT);
        state.objectId = event.objectId;
        state.roomId = event.roomId;
        state.category = event.category;
        state.authoritativeHeight = height;
        state.lastObjectHeight = objectHeight;
        state.dirtyInput = false;
        state.lastSendTime = -SLIDER_SEND_INTERVAL;
        setObjectId(event.objectId);
        setCategory(event.category);
        setAltitude(height);
        const data = GetSessionDataManager().getFloorItemData(roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID));
        setIsWalkHeightHelper(data?.className?.startsWith('tile_walkmagic') ?? false);
        setMultiWalk(Number(roomObject.model.getValue(RoomObjectVariable.FURNITURE_EXTRAS)) === 1);
    });

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.CLOSE_WIDGET, (event) => {
        const state = interaction.current;
        if (event.objectId === state.objectId && event.roomId === state.roomId && event.category === state.category) onClose();
    });

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, (event) => {
        if (event.session.roomId === interaction.current.roomId) onClose();
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id === interaction.current.objectId && event.category === interaction.current.category) onClose();
    });

    useEffect(() => {
        if (objectId === -1) return;

        const update = () => {
            const state = interaction.current;
            if (state.objectId === -1) return;
            const object = GetRoomEngine().getRoomObject(state.roomId, state.objectId, state.category);
            if (!object || !CanManipulateFurniture(GetRoomSession(), state.objectId, state.category)) return;
            const height = getCurrentStackHeight(object);
            if (state.lastObjectHeight === height) return;
            state.lastObjectHeight = height;
            updateAuthoritativeHeight(height);
        };

        GetTicker().add(update);
        return () => {
            GetTicker().remove(update);
        };
    }, [objectId, updateAuthoritativeHeight]);

    useEffect(() => cancelPendingSend, [cancelPendingSend]);

    return {
        objectId,
        inputValue,
        height: parseHeight(inputValue),
        sliderPosition,
        isWalkHeightHelper,
        multiWalk,
        onClose,
        selectSlider,
        beginSliderDrag,
        endSliderDrag,
        changeInput,
        commitInput,
        blurInput,
        performAction,
        toggleMultiWalk
    };
};
