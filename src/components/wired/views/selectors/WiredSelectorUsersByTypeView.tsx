import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const USER_TYPES = [1, 2, 4];

export const WiredSelectorUsersByTypeView: FC<{}> = () => {
    const [userType, setUserType] = useState(1);
    const { trigger = null, setIntParams = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setUserType(trigger.intData.length > 0 ? trigger.intData[0] : 1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([userType]);
    }, [userType, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.usertype')}</Text>
                    {USER_TYPES.map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={userType === value}
                                className="form-check-input"
                                name="usersByTypeSelector"
                                type="radio"
                                onChange={() => setUserType(value)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.usertype.${value}`)}</Text>
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
