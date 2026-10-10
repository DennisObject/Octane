import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** How the team is picked: the chosen one, the one with the fewest members, or a random one. */
export const JOIN_TEAM_MODES: Array<{ fallback: string; value: number }> = [
    { fallback: 'The chosen team', value: 0 },
    { fallback: 'The smallest team', value: 1 },
    { fallback: 'A random team', value: 2 }
];

const normalizeJoinMode = (value: number): number => (value === 1 || value === 2 ? value : 0);

export const WiredActionJoinTeamView: FC<{}> = (props) => {
    const [selectedTeamType, setSelectedTeamType] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const [joinMode, setJoinMode] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => setIntParams([selectedTeamType, selectedTeam, userSource, joinMode]);

    useEffect(() => {
        if (trigger.intData.length > 2) {
            setSelectedTeamType(trigger.intData[0]);
            setSelectedTeam(trigger.intData[1]);
            setUserSource(trigger.intData[2]);
            setJoinMode(normalizeJoinMode(trigger.intData[3]));
        } else {
            setJoinMode(0);
            setSelectedTeamType(0);
            setSelectedTeam(trigger.intData.length > 0 ? trigger.intData[0] : 1);
            setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        }
    }, [trigger]);

    // class_4212: "Pick team" in two columns, then "Choose type:". The join mode section is an Volt addition
    // (smallest/random team) that the official dialog does not have; it stays last so the native part keeps its layout.
    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup
                    columns={2}
                    name="selectedTeam"
                    options={[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`), disabled: joinMode !== 0 }))}
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.choose_type')}>
                <WiredRadioGroup
                    name="selectedTeamType"
                    options={[
                        { id: 0, label: localizeWithFallback('wiredfurni.params.team_type.0', 'Wired') },
                        { id: 1, label: localizeWithFallback('wiredfurni.params.team_type.1', 'Battle Banzai') },
                        { id: 2, label: localizeWithFallback('wiredfurni.params.team_type.2', 'Freeze') }
                    ]}
                    value={selectedTeamType}
                    onChange={setSelectedTeamType}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.team.join_mode', 'Join')}>
                <WiredRadioGroup
                    name="joinMode"
                    options={JOIN_TEAM_MODES.map((mode) => ({ id: mode.value, label: localizeWithFallback(`wiredfurni.params.team.join_mode.${mode.value}`, mode.fallback) }))}
                    value={joinMode}
                    onChange={setJoinMode}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
