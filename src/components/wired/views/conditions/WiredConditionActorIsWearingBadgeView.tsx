import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredQuantifierSection } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/**
 * What the text field holds. The badge, tag and motto conditions all store a string plus the same
 * user source and quantifier, so they share this dialog — but a tag is not a badge code and neither
 * is a motto, and each has its own length limit. `null` is for the gender and room-rights conditions,
 * whose answer comes from the user rather than from anything typed: they hide the field entirely.
 */
type WiredTextField = 'badge' | 'tag' | 'motto';

const TEXT_FIELDS: Record<WiredTextField, { key: string; fallback: string; maxLength?: number }> = {
    badge: { key: 'wiredfurni.params.badgecode', fallback: 'Badge code' },
    tag: { key: 'wiredfurni.params.tag', fallback: 'Tag', maxLength: 38 },
    motto: { key: 'wiredfurni.params.motto_contains', fallback: 'Motto contains', maxLength: 64 }
};

interface WiredConditionActorIsWearingBadgeViewProps {
    negative?: boolean;
    field?: WiredTextField | null;
}

export const WiredConditionActorIsWearingBadgeView: FC<WiredConditionActorIsWearingBadgeViewProps> = ({ negative = false, field = 'badge' }) => {
    const [badge, setBadge] = useState('');
    const [quantifier, setQuantifier] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return 0;
    });

    const text = field ? TEXT_FIELDS[field] : null;

    const save = () => {
        setStringParam(text ? badge : '');
        setIntParams([userSource, quantifier]);
    };

    useEffect(() => {
        setBadge(trigger.stringData);
        if (trigger.intData.length >= 1) setUserSource(trigger.intData[0]);
        else setUserSource(0);
        setQuantifier(trigger.intData.length >= 2 ? (trigger.intData[1] === 1 ? 1 : 0) : 1);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredQuantifierSection kind="users" name="badgeQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            {text && (
                <WiredSection title={localizeWithFallback(text.key, text.fallback)}>
                    <WiredTextInput maxLength={text.maxLength ?? 1000} value={badge} onChange={setBadge} />
                </WiredSection>
            )}
        </WiredConditionBaseView>
    );
};
