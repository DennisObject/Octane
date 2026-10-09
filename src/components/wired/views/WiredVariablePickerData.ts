export type WiredVariablePickerTarget = 'user' | 'furni' | 'global' | 'context';
export type WiredVariablePickerUsage = 'give' | 'remove' | 'change-destination' | 'change-reference' | 'condition' | 'filter-main' | 'echo';

export interface IWiredVariableDefinitionLike {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    itemId: number;
    name: string;
}

export interface IWiredVariablePickerEntry {
    id: string;
    token: string;
    label: string;
    displayLabel: string;
    searchableText: string;
    selectable: boolean;
    hasValue: boolean;
    kind: 'internal' | 'custom';
    target: WiredVariablePickerTarget;
    children?: IWiredVariablePickerEntry[];
}

interface IInternalVariableMeta {
    key: string;
    canUseAsDestination: boolean;
    canUseAsReference: boolean;
    canCreateAndDelete: boolean;
}

const INTERNAL_VARIABLE_ALIASES: Record<string, string> = {
    '@projectile.animation.is_traveling': '@projectile.animation.is_travelling',
    '@projectile.animation.tiles_traveled': '@projectile.animation.tiles_travelled',
    '@position.x': '@position_x',
    '@position.y': '@position_y',
    '@effect': '@effect_id',
    '@handitems': '@handitem_id',
    '@is_mute': '@is_muted',
    '@teams.red.score': '@team_red_score',
    '@teams.green.score': '@team_green_score',
    '@teams.blue.score': '@team_blue_score',
    '@teams.yellow.score': '@team_yellow_score',
    '@teams.red.size': '@team_red_size',
    '@teams.green.size': '@team_green_size',
    '@teams.blue.size': '@team_blue_size',
    '@teams.yellow.size': '@team_yellow_size'
};

const CUSTOM_TOKEN_PREFIX = 'custom:';
const INTERNAL_TOKEN_PREFIX = 'internal:';
const GROUP_TOKEN_PREFIX = 'group:';

const createInternalMeta = (key: string, canUseAsDestination = false, canUseAsReference = false, canCreateAndDelete = false): IInternalVariableMeta => ({
    key,
    canUseAsDestination,
    canUseAsReference,
    canCreateAndDelete
});

export const normalizeInternalVariableKey = (key: string) => {
    const normalizedKey = key?.trim();

    if (!normalizedKey) return '';

    return INTERNAL_VARIABLE_ALIASES[normalizedKey] || normalizedKey;
};

const INTERNAL_VARIABLES: Record<'user' | 'furni' | 'global' | 'context', IInternalVariableMeta[]> = {
    furni: [
        createInternalMeta('@position', true, true),
        createInternalMeta('@occupation', true, true),
        createInternalMeta('~background_color.hue', true, true),
        createInternalMeta('~background_color.saturation', true, true),
        createInternalMeta('~background_color.lightness', true, true),
        createInternalMeta('~chest.available_amount', false, true),
        createInternalMeta('~chest.capacity', false, true),
        createInternalMeta('~chest.is_auto_lock', false, false),
        createInternalMeta('~chest.locked', false, false),
        createInternalMeta('~chest.is_open', false, false),
        createInternalMeta('~chest.is_donatable', false, false),
        createInternalMeta('~teleport.target_id', true, true),
        createInternalMeta('~area_hide.root_x', true, true),
        createInternalMeta('~area_hide.root_y', true, true),
        createInternalMeta('~area_hide.width', true, true),
        createInternalMeta('~area_hide.length', true, true),
        createInternalMeta('~area_hide.is_invisible_furni', false, false, true),
        createInternalMeta('~area_hide.hiding_wallitems', false, false, true),
        createInternalMeta('~area_hide.inverted', false, false, true),
        createInternalMeta('@id', false, true),
        createInternalMeta('@class_id', false, true),
        createInternalMeta('@height', false, true),
        createInternalMeta('@state', true, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@rotation', true, true),
        createInternalMeta('@altitude', true, true),
        createInternalMeta('@opacity', true, true),
        createInternalMeta('@gravity', true, true),
        createInternalMeta('@is_invisible', false, false),
        createInternalMeta('@type', false, true),
        createInternalMeta('@is_stackable', false, false),
        createInternalMeta('@can_stand_on', false, false),
        createInternalMeta('@can_sit_on', false, false),
        createInternalMeta('@can_lay_on', false, false),
        createInternalMeta('@wallitem_offset', false, true),
        createInternalMeta('@dimensions.x', false, true),
        createInternalMeta('@dimensions.y', false, true),
        createInternalMeta('@owner_id', false, true),
        createInternalMeta('@projectile.animation.position.x', false, true),
        createInternalMeta('@projectile.animation.position.y', false, true),
        createInternalMeta('@projectile.animation.position.altitude', false, true),
        createInternalMeta('@projectile.animation.is_travelling', false, false),
        createInternalMeta('@projectile.animation.tiles_travelled', false, true),
        createInternalMeta('@projectile.animation.furni_collisions', false, true),
        createInternalMeta('@projectile.animation.user_collisions', false, true)
    ],
    user: [
        createInternalMeta('@position', true, true),
        createInternalMeta('~horse.controller_user_id', false, true),
        createInternalMeta('~horse.has_saddle', false, false),
        createInternalMeta('~horse.is_riding', false, false),
        createInternalMeta('~pet.creation_time', false, true),
        createInternalMeta('~pet.energy', false, true),
        createInternalMeta('~pet.experience', false, true),
        createInternalMeta('~pet.experience_required', false, true),
        createInternalMeta('~pet.happiness', false, true),
        createInternalMeta('~pet.level', false, true),
        createInternalMeta('~pet.max_energy', false, true),
        createInternalMeta('~pet.max_happiness', false, true),
        createInternalMeta('~pet.max_level', false, true),
        createInternalMeta('~pet.owner_id', false, true),
        createInternalMeta('~pet.scratches', false, true),
        createInternalMeta('@transaction.in_trade', false, false),
        createInternalMeta('@transaction.contract_id', false, true),
        createInternalMeta('@transaction.state', false, true),
        createInternalMeta('@transaction.can_accept', false, false),
        createInternalMeta('@transaction.current_multiplier', false, true),
        createInternalMeta('@index', false, true),
        createInternalMeta('@type', false, true),
        createInternalMeta('@gender', false, true),
        createInternalMeta('@level', false, true),
        createInternalMeta('@achievement_score', false, true),
        createInternalMeta('@is_hc', false, false),
        createInternalMeta('@has_rights', false, false),
        createInternalMeta('@is_group_admin', false, false),
        createInternalMeta('@is_owner', false, false),
        createInternalMeta('@is_muted', false, false),
        createInternalMeta('@is_trading', false, false),
        createInternalMeta('@is_frozen', false, false),
        createInternalMeta('@effect_id', false, true),
        createInternalMeta('@team_score', false, true),
        createInternalMeta('@team_color', false, true),
        createInternalMeta('@team_type', false, true),
        createInternalMeta('@sign', false, true),
        createInternalMeta('@dance', false, true),
        createInternalMeta('@is_idle', false, false),
        createInternalMeta('@handitem_id', false, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@direction', true, true),
        createInternalMeta('@altitude', false, true),
        createInternalMeta('@favourite_group_id', false, true),
        createInternalMeta('@room_entry.method', false, true),
        createInternalMeta('@room_entry.teleport_id', false, true),
        createInternalMeta('@user_id', false, true),
        createInternalMeta('@bot_id', false, true),
        createInternalMeta('@pet_id', false, true),
        createInternalMeta('@pet_owner_id', false, true)
    ],
    global: [
        createInternalMeta('@furni_count', false, true),
        createInternalMeta('@user_count', false, true),
        createInternalMeta('@wired_timer', false, true),
        createInternalMeta('@team_red_score', false, true),
        createInternalMeta('@team_green_score', false, true),
        createInternalMeta('@team_blue_score', false, true),
        createInternalMeta('@team_yellow_score', false, true),
        createInternalMeta('@team_red_size', false, true),
        createInternalMeta('@team_green_size', false, true),
        createInternalMeta('@team_blue_size', false, true),
        createInternalMeta('@team_yellow_size', false, true),
        createInternalMeta('@room_id', false, true),
        createInternalMeta('@group_id', false, true),
        createInternalMeta('@timezone_server', false, true),
        createInternalMeta('@timezone_client', false, true),
        createInternalMeta('@current_time', false, true),
        createInternalMeta('@current_time.millisecond_of_second', false, true),
        createInternalMeta('@current_time.seconds_of_minute', false, true),
        createInternalMeta('@current_time.minute_of_hour', false, true),
        createInternalMeta('@current_time.hour_of_day', false, true),
        createInternalMeta('@current_time.day_of_week', false, true),
        createInternalMeta('@current_time.day_of_month', false, true),
        createInternalMeta('@current_time.day_of_year', false, true),
        createInternalMeta('@current_time.week_of_year', false, true),
        createInternalMeta('@current_time.month_of_year', false, true),
        createInternalMeta('@current_time.year', false, true)
    ],
    context: [
        createInternalMeta('@event.transaction_complete.multiplier', false, true),
        createInternalMeta('@event.transaction_complete.deposit.furni_count', false, true),
        createInternalMeta('@event.transaction_complete.deposit.coins_count', false, true),
        createInternalMeta('@event.transaction_complete.withdrawal.furni_count', false, true),
        createInternalMeta('@event.transaction_complete.withdrawal.coins_count', false, true),
        createInternalMeta('@event.transaction_failed.reason', false, true),
        createInternalMeta('@selector_furni_count', false, true),
        createInternalMeta('@selector_user_count', false, true),
        createInternalMeta('@signal_furni_count', false, true),
        createInternalMeta('@signal_user_count', false, true),
        createInternalMeta('@antenna_id', false, true),
        createInternalMeta('@chat_type', false, true),
        createInternalMeta('@chat_style', false, true)
    ]
};

const sortEntries = (left: IWiredVariablePickerEntry, right: IWiredVariablePickerEntry) => {
    return left.displayLabel.localeCompare(right.displayLabel, undefined, { sensitivity: 'base' });
};

const getNormalizedInternalTarget = (target: WiredVariablePickerTarget): 'user' | 'furni' | 'global' | 'context' => {
    if (target === 'furni') return 'furni';
    if (target === 'user') return 'user';
    if (target === 'context') return 'context';

    return 'global';
};

const getInternalSelectable = (usage: WiredVariablePickerUsage, meta: IInternalVariableMeta) => {
    switch (usage) {
        case 'condition':
            return true;
        case 'filter-main':
            return meta.canUseAsReference;
        case 'echo':
            return true;
        case 'give':
        case 'remove':
            return meta.canCreateAndDelete;
        case 'change-destination':
            return meta.canUseAsDestination;
        case 'change-reference':
            return meta.canUseAsReference;
        default:
            return false;
    }
};

const getCustomSelectable = (usage: WiredVariablePickerUsage, definition: IWiredVariableDefinitionLike) => {
    switch (usage) {
        case 'condition':
        case 'filter-main':
            return true;
        case 'echo':
            return definition.name.includes('.');
        case 'change-reference':
            return !!definition.hasValue;
        case 'change-destination':
            return !!definition.hasValue && !definition.isReadOnly;
        default:
            return !definition.isReadOnly;
    }
};

const getRootKey = (key: string) => {
    const separatorIndex = key.indexOf('.');

    if (separatorIndex < 0) return null;

    return key.slice(0, separatorIndex);
};

const createInternalEntry = (target: WiredVariablePickerTarget, usage: WiredVariablePickerUsage, meta: IInternalVariableMeta): IWiredVariablePickerEntry => ({
    id: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    token: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    label: meta.key,
    displayLabel: meta.key,
    searchableText: meta.key,
    selectable: getInternalSelectable(usage, meta),
    hasValue: meta.canUseAsReference,
    kind: 'internal',
    target
});

const createCustomEntry = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    definition: IWiredVariableDefinitionLike
): IWiredVariablePickerEntry => ({
    id: `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    token: `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    label: definition.name,
    displayLabel: definition.name,
    searchableText: definition.name,
    selectable: getCustomSelectable(usage, definition),
    hasValue: !!definition.hasValue,
    kind: 'custom',
    target
});

const groupEntries = (entries: IWiredVariablePickerEntry[]) => {
    const groupedParents = new Map<string, { exact?: IWiredVariablePickerEntry; children: IWiredVariablePickerEntry[] }>();

    for (const entry of entries) {
        const displayLabel = entry.displayLabel?.trim();

        if (!displayLabel?.length) {
            continue;
        }

        const rootKey = getRootKey(displayLabel) || displayLabel;
        let group = groupedParents.get(rootKey);

        if (!group) {
            group = { children: [] };
            groupedParents.set(rootKey, group);
        }

        if (displayLabel === rootKey) {
            group.exact = {
                ...entry,
                label: displayLabel,
                displayLabel,
                searchableText: displayLabel
            };
            continue;
        }

        const childLabel = displayLabel.slice(rootKey.length + 1).trim();

        if (!childLabel.length) continue;

        group.children.push({
            ...entry,
            label: childLabel,
            displayLabel,
            searchableText: `${displayLabel} ${childLabel}`
        });
    }

    const groupedEntries: IWiredVariablePickerEntry[] = [];

    for (const [rootKey, group] of groupedParents) {
        const sortedChildren = [...group.children]
            .sort(sortEntries)
            .filter((child, index, collection) => collection.findIndex((entry) => entry.token === child.token) === index);
        const shouldGroup = !!sortedChildren.length && (sortedChildren.length > 1 || !!group.exact);

        if (!shouldGroup) {
            if (group.exact) groupedEntries.push(group.exact);
            groupedEntries.push(...sortedChildren.map((child) => ({ ...child, label: child.displayLabel })));
            continue;
        }

        groupedEntries.push({
            ...(group.exact || {
                id: `${GROUP_TOKEN_PREFIX}${rootKey}`,
                token: `${GROUP_TOKEN_PREFIX}${rootKey}`,
                label: rootKey,
                displayLabel: rootKey,
                searchableText: rootKey,
                selectable: false,
                hasValue: false,
                kind: sortedChildren[0]?.kind || 'custom',
                target: sortedChildren[0]?.target || 'user'
            }),
            label: rootKey,
            displayLabel: rootKey,
            searchableText: `${rootKey} ${sortedChildren.map((child) => child.displayLabel).join(' ')}`,
            children: sortedChildren
        });
    }

    return groupedEntries
        .filter((entry) => entry.displayLabel?.trim().length)
        .sort(sortEntries)
        .filter((entry, index, collection) => collection.findIndex((currentEntry) => currentEntry.token === entry.token) === index);
};

export const createCustomVariableToken = (itemId: number) => (itemId > 0 ? `${CUSTOM_TOKEN_PREFIX}${itemId}` : '');
export const createInternalVariableToken = (key: string) => {
    const normalizedKey = normalizeInternalVariableKey(key);

    return normalizedKey ? `${INTERNAL_TOKEN_PREFIX}${normalizedKey}` : '';
};
export const isCustomVariableToken = (token: string) => !!token && token.startsWith(CUSTOM_TOKEN_PREFIX);
export const isInternalVariableToken = (token: string) => !!token && token.startsWith(INTERNAL_TOKEN_PREFIX);
export const getCustomVariableItemId = (token: string) => (isCustomVariableToken(token) ? parseInt(token.slice(CUSTOM_TOKEN_PREFIX.length), 10) || 0 : 0);
export const getInternalVariableKey = (token: string) =>
    isInternalVariableToken(token) ? normalizeInternalVariableKey(token.slice(INTERNAL_TOKEN_PREFIX.length)) : '';

export const normalizeVariableTokenFromWire = (value: string) => {
    const normalizedValue = value?.trim();

    if (!normalizedValue) return '';
    if (isCustomVariableToken(normalizedValue)) return normalizedValue;
    if (isInternalVariableToken(normalizedValue)) return createInternalVariableToken(normalizedValue.slice(INTERNAL_TOKEN_PREFIX.length));

    const parsedValue = parseInt(normalizedValue, 10);

    return !Number.isNaN(parsedValue) && parsedValue > 0 ? createCustomVariableToken(parsedValue) : '';
};

export const createFallbackVariableEntry = (target: WiredVariablePickerTarget, token: string): IWiredVariablePickerEntry | null => {
    if (!token) return null;

    if (isCustomVariableToken(token)) {
        const itemId = getCustomVariableItemId(token);

        if (itemId <= 0) return null;

        return {
            id: token,
            token,
            label: `#${itemId}`,
            displayLabel: `#${itemId}`,
            searchableText: `#${itemId}`,
            selectable: true,
            hasValue: false,
            kind: 'custom',
            target
        };
    }

    if (isInternalVariableToken(token)) {
        const key = getInternalVariableKey(token);

        if (!key) return null;

        return {
            id: token,
            token,
            label: key,
            displayLabel: key,
            searchableText: key,
            selectable: false,
            hasValue: false,
            kind: 'internal',
            target
        };
    }

    return null;
};

export const canMutateWiredBuiltinPresence = (target: WiredVariablePickerTarget, token: string) =>
    INTERNAL_VARIABLES[getNormalizedInternalTarget(target)].some(meta => meta.canCreateAndDelete && token === createInternalVariableToken(meta.key));

export const buildWiredVariablePickerEntries = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    customDefinitions: IWiredVariableDefinitionLike[]
) => {
    const internalTarget = getNormalizedInternalTarget(target);
    const customEntries = groupEntries([...(customDefinitions || [])].map((definition) => createCustomEntry(target, usage, definition)).sort(sortEntries));
    const internalEntries = groupEntries(INTERNAL_VARIABLES[internalTarget].map((meta) => createInternalEntry(target, usage, meta)));

    return [...customEntries, ...internalEntries];
};

export const flattenWiredVariablePickerEntries = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
    const flattened: IWiredVariablePickerEntry[] = [];

    for (const entry of entries) {
        flattened.push(entry);

        if (entry.children?.length) flattened.push(...entry.children);
    }

    return flattened;
};
