import { localizeWithFallback } from '../../api/utils/localizeWithFallback';

/** Field error key the server uses for a problem that belongs to the whole form. */
const FORM_FIELD = '_form';

/**
 * Every sentence the server (PlusEMU E3) puts in a CatalogAdminResult message, a field error or an
 * undo reply, with the localisation key that replaces it. `{name}` marks a value the server fills
 * in; it is handed to the text as `%name%`. A sentence that is not listed is shown as sent.
 */
const KNOWN_SENTENCES: ReadonlyArray<readonly [template: string, key: string]> = [
    // Successful changes
    ['Page created', 'catalog.admin.server.message.page.created'],
    ['Page saved', 'catalog.admin.server.message.page.saved'],
    ['Page deleted', 'catalog.admin.server.message.page.deleted'],
    ['Page moved', 'catalog.admin.server.message.page.moved'],
    ['Page images saved', 'catalog.admin.server.message.page.images.saved'],
    ['Offer created', 'catalog.admin.server.message.offer.created'],
    ['Offer saved', 'catalog.admin.server.message.offer.saved'],
    ['Offer deleted', 'catalog.admin.server.message.offer.deleted'],
    ['Offer moved', 'catalog.admin.server.message.offer.moved'],
    ['Offers reordered', 'catalog.admin.server.message.offers.reordered'],
    ['Catalog reloaded.', 'catalog.admin.server.message.catalog.reloaded'],
    ['Change undone', 'catalog.admin.server.message.undo.change'],
    ['Move undone', 'catalog.admin.server.message.undo.move'],
    // Refusals
    ['No permission.', 'catalog.admin.server.message.forbidden'],
    ['Page not found.', 'catalog.admin.server.message.page.missing'],
    ['Offer not found.', 'catalog.admin.server.message.offer.missing'],
    ['History entry not found.', 'catalog.admin.server.message.history.missing'],
    ['The catalog changed since you opened it. Reload and try again.', 'catalog.admin.server.message.stale'],
    ['Operation id is too long.', 'catalog.admin.server.message.operation.id'],
    ['You cannot edit a page above your rank.', 'catalog.admin.server.message.page.rank'],
    ['You cannot edit an offer on a page above your rank.', 'catalog.admin.server.message.offer.rank'],
    ['This move would reorder pages above your rank.', 'catalog.admin.server.message.move.rank'],
    ['This move reordered pages above your rank.', 'catalog.admin.server.message.undo.move.rank'],
    ['Move or delete the child pages first.', 'catalog.admin.server.message.page.children'],
    ['Move or delete the offers on this page first.', 'catalog.admin.server.message.page.offers'],
    ['Offer #{id} is on several pages; open its page and try again.', 'catalog.admin.server.message.offer.ambiguous'],
    ['Reopen this offer before saving; the server cannot tell which offer this form belongs to.', 'catalog.admin.server.message.offer.reopen'],
    ['Reorder offers one page at a time.', 'catalog.admin.server.message.reorder.page'],
    ['Send 1 to 500 distinct offers with non-negative order numbers.', 'catalog.admin.server.message.reorder.list'],
    ['Reorder 1 to 500 offers at a time.', 'catalog.admin.server.message.reorder.count'],
    ['Order cannot be negative.', 'catalog.admin.server.message.order.negative'],
    ['Icon must be between 0 and 1000000.', 'catalog.admin.server.message.icon.range'],
    ['Only edits and moves can be undone; delete or recreate the entity instead.', 'catalog.admin.server.message.undo.unsupported'],
    ['This entity changed again later; undo the newer change first.', 'catalog.admin.server.message.undo.conflict'],
    ['The logged change cannot be read.', 'catalog.admin.server.message.undo.unreadable'],
    // Field errors
    ['Required.', 'catalog.admin.server.message.field.required'],
    ['Limited to {max} characters.', 'catalog.admin.server.message.field.length'],
    ['Control characters are not allowed.', 'catalog.admin.server.message.field.control'],
    ['Use up to 128 letters, digits, \'_\', \'-\' or \'.\'.', 'catalog.admin.server.message.field.link'],
    ['Unknown layout.', 'catalog.admin.server.message.field.layout'],
    ['Minimum rank must be between 1 and your rank ({rank}).', 'catalog.admin.server.message.field.rank'],
    ['Pages belong to the normal or the builders club catalog.', 'catalog.admin.server.message.field.catalog'],
    ['A page cannot move to the other catalog.', 'catalog.admin.server.message.field.catalog.move'],
    ['Parent page not found.', 'catalog.admin.server.message.field.parent.missing'],
    ['You cannot use a page above your rank as parent.', 'catalog.admin.server.message.field.parent.rank'],
    ['The parent page is in the other catalog.', 'catalog.admin.server.message.field.parent.catalog'],
    ['A page cannot be moved under itself.', 'catalog.admin.server.message.field.parent.self'],
    ['The page tree is too deep.', 'catalog.admin.server.message.field.parent.depth'],
    ['\'|\' separates page texts and cannot be used.', 'catalog.admin.server.message.field.pipe'],
    ['Not supported by this hotel.', 'catalog.admin.server.message.field.unsupported'],
    ['Enter one furniture id; bundles are not supported by this hotel.', 'catalog.admin.server.message.field.items.single'],
    ['Furniture #{id} does not exist.', 'catalog.admin.server.message.field.items.missing'],
    ['The item of a habbicon offer cannot change.', 'catalog.admin.server.message.field.items.habbicon'],
    ['Credits must be between 0 and 1000000.', 'catalog.admin.server.message.field.credits'],
    ['Points must be between 0 and 1000000.', 'catalog.admin.server.message.field.points'],
    ['Points are duckets (0) or diamonds (5).', 'catalog.admin.server.message.field.points.type'],
    ['Amount must be between 1 and 100.', 'catalog.admin.server.message.field.amount'],
    ['Extra data is limited to 1024 characters.', 'catalog.admin.server.message.field.extradata'],
    ['Offer id cannot be negative.', 'catalog.admin.server.message.field.offer.id'],
    ['Limited stack must be between 0 and 1000000.', 'catalog.admin.server.message.field.limited.range'],
    ['{n} are already sold.', 'catalog.admin.server.message.field.limited.sold']
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Turns "Offer #{id} is ..." into a pattern that captures `id`. */
const compileSentence = ([template, key]: readonly [string, string]) => {
    const parameters: string[] = [];
    const source = template
        .split(/(\{\w+\})/)
        .map((part) => {
            const parameter = /^\{(\w+)\}$/.exec(part);
            if (!parameter) return escapeRegExp(part);

            parameters.push(parameter[1]);
            return '(.+?)';
        })
        .join('');

    return { pattern: new RegExp(`^${source}$`), parameters, key };
};

const SENTENCES = KNOWN_SENTENCES.map(compileSentence);

/** The validation summary when there is no form error: "{field}: {error}" for the first field error. */
const FIELD_SUMMARY = /^\w+: (.+)$/;

/** A server sentence in the user's language; unknown text is returned as sent. */
export const localizeCatalogAdminMessage = (message: string): string => {
    if (!message) return message;

    for (const sentence of SENTENCES) {
        const match = sentence.pattern.exec(message);
        if (match) return localizeWithFallback(sentence.key, message, sentence.parameters, match.slice(1));
    }

    const summary = FIELD_SUMMARY.exec(message);
    if (summary) {
        const error = localizeCatalogAdminMessage(summary[1]);
        if (error !== summary[1]) return error;
    }

    return message;
};

/** Server field errors, keyed by editor field, in the user's language. */
export const localizeCatalogAdminFieldErrors = (fieldErrors: Record<string, string>): Record<string, string> =>
    Object.fromEntries(
        Object.entries(fieldErrors)
            .filter(([field]) => field !== FORM_FIELD)
            .map(([field, message]) => [field, localizeCatalogAdminMessage(message)])
    );

/**
 * A refused answer (STALE_REVISION, VALIDATION_FAILED, CONFLICT, ...) in the user's language: the
 * form error if there is one, else the first refused field, else the server's sentence, and only
 * when that sentence is unknown the generic text of its code.
 */
export const localizeCatalogAdminCode = (code: string, serverMessage: string, fieldErrors: Record<string, string>): string => {
    const formError = fieldErrors[FORM_FIELD];
    if (formError) return localizeCatalogAdminMessage(formError);

    const [firstError = ''] = Object.values(localizeCatalogAdminFieldErrors(fieldErrors));
    if (code === 'VALIDATION_FAILED' && firstError)
        return localizeWithFallback('catalog.admin.server.code.VALIDATION_FAILED', firstError, ['error'], [firstError]);

    const sentence = localizeCatalogAdminMessage(serverMessage);
    if (sentence && sentence !== serverMessage) return sentence;

    return localizeWithFallback(`catalog.admin.server.code.${code}`, serverMessage || code);
};

/** A bare CatalogAdminResult message (no code); known sentences are localised, others shown as sent. */
export const localizeCatalogAdminPlainMessage = localizeCatalogAdminMessage;
