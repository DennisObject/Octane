import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Button } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMoveFurniAsGroupView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources, setUserSources, furniIds, secondaryFurniIds,
        activePickSlot, setActivePickSlot } = useWired();
    const [targetUser, setTargetUser] = useState(false);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [moverSource, setMoverSource] = useState(100);
    const [targetSource, setTargetSource] = useState(101);
    const [userSource, setUserSource] = useState(0);
    useEffect(() => {
        setTargetUser(trigger.intData[0] === 1);
        setX(trigger.intData[1]); setY(trigger.intData[2]);
        setMoverSource(trigger.furniSources[0]); setTargetSource(trigger.furniSources[1]); setUserSource(trigger.userSources[0]);
    }, [trigger]);
    const save = () => {
        setIntParams([targetUser ? 1 : 0, x, y]);
        setFurniSources([moverSource, targetSource]); setUserSources([userSource]);
    };
    return <WiredActionBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE} save={save}
        footer={<>
            <WiredSourcesSelector showFurni furniSlot={0} furniTitle="Movers" furniSource={moverSource} onChangeFurni={setMoverSource} />
            {!targetUser && <WiredSourcesSelector showFurni furniSlot={1} furniTitle="Target furniture" furniSource={targetSource} onChangeFurni={setTargetSource} />}
            {targetUser && <WiredSourcesSelector showUsers userSource={userSource} onChangeUsers={setUserSource} />}
            <div className="flex gap-2">
                <Button disabled={activePickSlot === 0} onClick={() => setActivePickSlot(0)}>Primary picks ({furniIds.length})</Button>
                <Button disabled={activePickSlot === 1} onClick={() => setActivePickSlot(1)}>Secondary picks ({secondaryFurniIds.length})</Button>
            </div>
        </>}>
        <label><input type="checkbox" checked={targetUser} onChange={event => setTargetUser(event.target.checked)} /> Target a user</label>
        <label>X offset <input type="number" min={-64} max={64} value={x} onChange={event => setX(Number(event.target.value))} /></label>
        <label>Y offset <input type="number" min={-64} max={64} value={y} onChange={event => setY(Number(event.target.value))} /></label>
    </WiredActionBaseView>;
};
