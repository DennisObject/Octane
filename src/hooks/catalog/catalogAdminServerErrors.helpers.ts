import { localizeWithFallback } from '../../api/utils/localizeWithFallback';

/** Field error key the server uses for a problem that belongs to the whole form. */
const FORM_FIELD = '_form';

/**
 * Structural changes (delete, move, show/hide, reorder) are answered with a bare message and no
 * code, so the known server sentences are matched here; anything else is shown as sent.
 */
const PLAIN_MESSAGE_KEYS: Record<string, string> = {
    'No permission.': 'catalog.admin.server.code.FORBIDDEN',
    'Page not found.': 'catalog.admin.server.code.NOT_FOUND',
    'Offer not found.': 'catalog.admin.server.code.NOT_FOUND',
    'The catalog changed since you opened it. Reload and try again.': 'catalog.admin.server.code.STALE_REVISION',
    'You cannot edit a page above your rank.': 'catalog.admin.server.error._form',
    'Move or delete the child pages first.': 'catalog.admin.server.error.page.children',
    'Move or delete the offers on this page first.': 'catalog.admin.server.error.page.offers'
};

/** Server field errors, keyed by editor field, in the user's language; unknown ones keep the server text. */
export const localizeCatalogAdminFieldErrors = (fieldErrors: Record<string, string>): Record<string, string> =>
    Object.fromEntries(
        Object.entries(fieldErrors)
            .filter(([field]) => field !== FORM_FIELD)
            .map(([field, message]) => [field, localizeWithFallback(`catalog.admin.server.error.${field}`, message)])
    );

/**
 * A save answer's code (STALE_REVISION, VALIDATION_FAILED, ...) in the user's language. A refused
 * value names the first problem too, since not every field the server checks has an input here.
 */
export const localizeCatalogAdminCode = (code: string, serverMessage: string, fieldErrors: Record<string, string>): string => {
    const formError = fieldErrors[FORM_FIELD];
    if (formError) return localizeWithFallback('catalog.admin.server.error._form', formError);

    const [firstError = ''] = Object.values(localizeCatalogAdminFieldErrors(fieldErrors));
    if (code === 'VALIDATION_FAILED' && firstError)
        return localizeWithFallback('catalog.admin.server.code.VALIDATION_FAILED', firstError, ['error'], [firstError]);

    return localizeWithFallback(`catalog.admin.server.code.${code}`, serverMessage || code);
};

export const localizeCatalogAdminPlainMessage = (message: string): string => {
    const key = PLAIN_MESSAGE_KEYS[message];

    return key ? localizeWithFallback(key, message) : message;
};
