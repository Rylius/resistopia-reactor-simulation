// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {REACTOR_ID} from '../reactor';

export const STORAGE_ANTIMATTER_ID = 'storage-antimatter';

export default function createStorageAntimatter(config: Config): StateMachine {
    const maxReleasedAntimatter = config.value(STORAGE_ANTIMATTER_ID, 'maxReleasedAntimatter');

    const maxEnergyGeneration = config.value(REACTOR_ID, 'maxEnergyGeneration');
    const maxAntimatterInput = config.value(REACTOR_ID, 'maxAntimatterInput');
    const energyToAntimatter = maxEnergyGeneration / maxAntimatterInput;

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
        update(prevState, input, globals) {
            const release = prevState.releasedAntimatterPerTick + (globals.camouflageEnergyRequired * energyToAntimatter);
            const releasedAntimatter = Math.min(release, prevState.antimatter);
            return {
                antimatter: (prevState.antimatter - releasedAntimatter) + input.unusedAntimatter,
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter,
            };
        },
    };
}
