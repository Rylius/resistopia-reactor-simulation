// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

export const STORAGE_ANTIMATTER_ID = 'storage-antimatter';

export default function createStorageAntimatter(config: Config): StateMachine {
    const maxReleasedAntimatter = config.value(STORAGE_ANTIMATTER_ID, 'maxReleasedAntimatter');

    return {
        id: STORAGE_ANTIMATTER_ID,
        public: {
            releasedAntimatterPerTick: {
                min: 0,
                max: maxReleasedAntimatter,
            },
        },
        output: ['releasedAntimatter'],
        initialState() {
            return {
                antimatter: config.initial(STORAGE_ANTIMATTER_ID, 'antimatter'),
                releasedAntimatterPerTick: 0,
                releasedAntimatter: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: STORAGE_ANTIMATTER_ID,
                    property: 'releasedAntimatter',
                    as: 'unusedAntimatter',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const releasedAntimatter = Math.min(prevState.releasedAntimatterPerTick, prevState.antimatter);
            return {
                antimatter: (prevState.antimatter - releasedAntimatter) + input.unusedAntimatter,
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter,
            };
        },
    };
}
