import { VoltEvent } from '@volt/renderer';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useVoltEvent } from './useVoltEvent';

/**
 * Subscribe to a Volt renderer event and expose the latest derived value
 * as React state. Replaces the boilerplate pattern:
 *
 *   const [foo, setFoo] = useState(initial);
 *   useVoltEvent(EVENT, e => setFoo(selector(e)));
 *
 * with:
 *
 *   const foo = useVoltEventState(EVENT, selector, initial);
 *
 * The selector closure is captured in a ref refreshed in commit, so
 * a new selector identity per render does not re-subscribe the listener.
 */
export const useVoltEventState = <T extends VoltEvent, S>(
    type: string | string[],
    selector: (event: T) => S,
    initial: S | (() => S),
    enabled: boolean = true
): S => {
    const [value, setValue] = useState<S>(initial);
    const selectorRef = useRef(selector);

    useLayoutEffect(() => {
        selectorRef.current = selector;
    });

    const handler = useCallback((event: T) => {
        setValue(selectorRef.current(event));
    }, []);

    useVoltEvent<T>(type, handler, enabled);

    return value;
};
