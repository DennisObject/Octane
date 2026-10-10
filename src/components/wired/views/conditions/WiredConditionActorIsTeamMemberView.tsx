import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredQuantifierSection, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsTeamMemberViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsTeamMemberView: FC<WiredConditionActorIsTeamMemberViewProps> = ({ negative = false }) => {
    const [selectedTeam, setSelectedTeam] = useState(-1);
    const [quantifier, setQuantifier] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => setIntParams([selectedTeam, userSource, quantifier]);

    useEffect(() => {
        setSelectedTeam(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setQuantifier(trigger.intData.length > 2 ? (trigger.intData[2] === 1 ? 1 : 0) : 1);
    }, [trigger]);

    // class_3962: "any" on its own row, then the four teams in two columns.
    const teamOptions = [
        { id: 0, label: localizeWithFallback('wiredfurni.params.team.any', 'Any team'), newLine: true },
        ...[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`) }))
    ];

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredQuantifierSection kind="users" name="teamMemberQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup columns={2} name="selectedTeam" options={teamOptions} value={selectedTeam} onChange={setSelectedTeam} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
