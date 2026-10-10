import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Button } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSendSignalView: FC<{}> = () => {
    const { trigger, furniIds, secondaryFurniIds, activePickSlot, setActivePickSlot,
        setIntParams, setFurniSources, setUserSources, setAllowedInteractionTypes, setAllowedInteractionErrorKey } = useWired();
    const [antennaSource, setAntennaSource] = useState(100);
    const [forwardedSource, setForwardedSource] = useState(200);
    const [userSource, setUserSource] = useState(200);
    const [splitFurni, setSplitFurni] = useState(false);
    const [splitUsers, setSplitUsers] = useState(false);

    useEffect(() => {
        setAntennaSource(trigger.furniSources[0]);
        setForwardedSource(trigger.furniSources[1]);
        setUserSource(trigger.userSources[0]);
        setSplitFurni(trigger.intData[0] === 1);
        setSplitUsers(trigger.intData[1] === 1);
    }, [trigger]);

    useEffect(() => {
        const pickingAntennas = antennaSource === (activePickSlot === 0 ? 100 : 101);
        setAllowedInteractionTypes(pickingAntennas ? ['antenna'] : null);
        setAllowedInteractionErrorKey(pickingAntennas ? 'wiredfurni.error.require_antenna_furni' : null);
        return () => { setAllowedInteractionTypes(null); setAllowedInteractionErrorKey(null); };
    }, [activePickSlot, antennaSource, setAllowedInteractionTypes, setAllowedInteractionErrorKey]);

    const save = () => {
        setIntParams([splitFurni ? 1 : 0, splitUsers ? 1 : 0]);
        setFurniSources([antennaSource, forwardedSource]);
        setUserSources([userSource]);
    };

    return <WiredActionBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE} save={save}
        footer={<>
            <WiredSourcesSelector showFurni furniSlot={0} furniTitle="Antenna furniture" furniSource={antennaSource} onChangeFurni={setAntennaSource} />
            <WiredSourcesSelector showFurni showUsers furniSlot={1} furniTitle="Forwarded furniture" furniSource={forwardedSource}
                userSource={userSource} onChangeFurni={setForwardedSource} onChangeUsers={setUserSource} />
            <div className="flex gap-2">
                <Button onClick={() => setActivePickSlot(0)} disabled={activePickSlot === 0}>Primary picks ({furniIds.length})</Button>
                <Button onClick={() => setActivePickSlot(1)} disabled={activePickSlot === 1}>Secondary picks ({secondaryFurniIds.length})</Button>
            </div>
        </>}>
        <label><input type="checkbox" checked={splitFurni} onChange={event => setSplitFurni(event.target.checked)} /> One signal per furniture</label>
        <label><input type="checkbox" checked={splitUsers} onChange={event => setSplitUsers(event.target.checked)} /> One signal per user</label>
    </WiredActionBaseView>;
};
