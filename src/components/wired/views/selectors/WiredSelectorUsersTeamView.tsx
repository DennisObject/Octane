import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const TEAM_TYPES = [0, 1, 2, 3, 4];

export const WiredSelectorUsersTeamView: FC<{}> = () => {
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setTeamType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([teamType]);
    }, [teamType, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    {TEAM_TYPES.map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={teamType === value}
                                className="form-check-input"
                                name="usersTeamSelector"
                                type="radio"
                                onChange={() => setTeamType(value)}
                            />
                            <Text>{LocalizeText(value === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filter}
                        onChange={(event) => setFilter(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(event) => setInverse(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
