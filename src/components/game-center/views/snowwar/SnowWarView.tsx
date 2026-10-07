import { FC } from 'react';
import { SnowWarEngineState } from '../../../../api';
import { useSnowWar } from '../../../../hooks';
import { SnowWarArenaView } from './SnowWarArenaView';

/** SnowStorm overlay. Mounted in MainView so a running match survives closing games_main. */
export const SnowWarView: FC = () =>
{
    const { state } = useSnowWar();

    if(state < SnowWarEngineState.STAGE_STARTING || state > SnowWarEngineState.STAGE_ENDING) return null;

    return <SnowWarArenaView />;
};
