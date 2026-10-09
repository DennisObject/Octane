export interface ChatStyleDefinition
{
    styleId: number;
    isSystemStyle?: boolean;
    isHcOnly?: boolean;
    isAmbassadorOnly?: boolean;
}

export interface ChatStyleAccess
{
    hasClub: boolean;
    isAmbassador: boolean;
    hasSecurity: boolean;
}

// Chat input style list (v75): every non-system style of the style library the server allows, in library
// order, minus disabled.custom.chat.styles; ambassador styles need security level 4 or ambassador, HC styles need club.
export const getSelectableChatStyleIds = (definitions: ChatStyleDefinition[], allowedIds: ReadonlyArray<number>, disabled: string, access: ChatStyleAccess): number[] =>
{
    const allowed = new Set(allowedIds);
    const disabledIds = new Set(String(disabled ?? '').split(','));
    const selectable: number[] = [];

    for(const style of (definitions ?? []))
    {
        if(!style || style.isSystemStyle || !allowed.has(style.styleId)) continue;

        if(style.isAmbassadorOnly && (access.hasSecurity || access.isAmbassador))
        {
            selectable.push(style.styleId);
            continue;
        }

        if(disabledIds.has(style.styleId.toString())) continue;

        if(style.isHcOnly ? access.hasClub : !style.isAmbassadorOnly) selectable.push(style.styleId);
    }

    return selectable;
};
