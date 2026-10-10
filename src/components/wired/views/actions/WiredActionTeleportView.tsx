import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionTeleportView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources, setUserSources } = useWired();
    const isTeleport = trigger?.code === 8;
    const isUserToFurni = trigger?.code === 43;
    const [fast, setFast] = useState(false);
    const [walkMode, setWalkMode] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const [userSource, setUserSource] = useState(0);
    useEffect(() => {
        setFast(trigger?.intData[0] === 1);
        setWalkMode(trigger?.intData[0] ?? 0);
        setFurniSource(trigger?.furniSources[0] ?? 100);
        setUserSource(trigger?.userSources[0] ?? 0);
    }, [trigger]);
    const save = () => {
        setIntParams(isTeleport ? [fast ? 1 : 0] : isUserToFurni ? [walkMode] : []);
        setFurniSources([furniSource]);
        setUserSources([userSource]);
    };
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    showUsers={true}
                    furniSource={furniSource}
                    userSource={userSource}
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
        >
            {isTeleport && (
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={fast} onChange={(event) => setFast(event.target.checked)} />
                    <Text>{LocalizeText('wiredfurni.params.teleport.options.0')}</Text>
                </label>
            )}
            {isUserToFurni && (
                <div className="flex flex-col gap-1">
                    {[0, 1, 2].map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input type="radio" name="userWalkMode" checked={walkMode === value} onChange={() => setWalkMode(value)} />
                            <Text>{LocalizeText(`wiredfurni.params.user_move.walkmode.${value}`)}</Text>
                        </label>
                    ))}
                </div>
            )}
        </WiredActionBaseView>
    );
};
