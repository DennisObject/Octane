import { IMessageEvent, MessageEvent } from '@volt/renderer';
import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMessageEvent } from '../../hooks/events/useMessageEvent';

/**
 * Invalidate a TanStack query slot every time the renderer pushes the
 * matching parser event. Companion to useVoltQuery for the case where
 * the server can push fresh data unprompted (e.g. ClubGiftInfoEvent
 * fires both as the response to GetClubGiftInfo and again after the
 * user claims a gift via SelectClubGiftComposer).
 *
 * Usage:
 *
 *   const { data: clubGifts } = useVoltQuery({
 *       key: ['volt', 'catalog', 'clubGifts'],
 *       request: () => new GetClubGiftInfo(),
 *       parser: ClubGiftInfoEvent,
 *       select: e => e.getParser(),
 *   });
 *
 *   // re-fetch on every server push:
 *   useVoltEventInvalidator(ClubGiftInfoEvent, ['volt', 'catalog', 'clubGifts']);
 *
 * Optional `accept` predicate filters out events that don't belong to
 * this query slot — useful when the same parser is multiplexed across
 * multiple correlated queries (mirrors useVoltQuery.accept).
 *
 * Implementation: the renderer push triggers `queryClient.invalidateQueries`,
 * which marks the slot stale; the next subscriber render triggers a
 * fresh fetch via useVoltQuery's queryFn. If nobody is currently
 * subscribed, the invalidation is a no-op (TanStack drops stale entries
 * with no active observers per its garbage-collection policy).
 */
export const useVoltEventInvalidator = <T extends IMessageEvent>(eventType: typeof MessageEvent, queryKey: QueryKey, accept?: (event: T) => boolean) => {
    const queryClient = useQueryClient();

    useMessageEvent<T>(eventType, (event) => {
        if (accept && !accept(event)) return;

        queryClient.invalidateQueries({ queryKey });
    });
};
