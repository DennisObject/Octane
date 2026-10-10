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
    const { trigger = null, setIntParams = null, setUserSources = null } = useWired();
    const [userSource, setUserSource] = useState(0);
    const save = () => { setIntParams([selectedTeam, selectedTeamType]); setUserSources([userSource]); };
    useEffect(() => {
        setSelectedTeam(trigger.intData[0]);
        setSelectedTeamType(trigger.intData[1]);
        setUserSource(trigger.userSources[0]);
    }, [trigger]);

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
                    options={[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`) }))}
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
        </WiredActionBaseView>
    );
};
