// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {ENERGY_DISTRIBUTOR_ID} from './energy/distributor';
import {ENERGY_CAPACITOR_ID} from './energy/capacitor';

export const CORE_ID = 'core';

export default function createCore(config: Config): StateMachine {
    const energyRequired = config.value(CORE_ID, 'energyRequired');

    return {
        id: CORE_ID,
        initialState() {
            return {
                energyRequired,
                energyConsumed: 0,
                energyFromDistributor: 0,
                energyFromCapacitor: 0,
                energyMissing: 0,
                energySatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'coreEnergy',
                    as: 'energy',
                    max: prevState.energyRequired,
                },
                {
                    stateMachine: ENERGY_CAPACITOR_ID,
                    property: 'energy',
                    as: 'capacitorEnergy',
                    max: Math.max(prevState.energyRequired - prevState.energyFromDistributor, 0),
                },
            ];
        },
        update(prevState, input) {
            // It's possible we drew too much energy in one tick, so discard any excess
            const energy = Math.min(input.energy + input.capacitorEnergy, prevState.energyRequired);
            return {
                energyRequired: prevState.energyRequired,
                energyConsumed: energy,
                energyFromDistributor: input.energy,
                energyFromCapacitor: input.capacitorEnergy,
                energyMissing: Math.max(prevState.energyRequired - energy, 0),
                energySatisfaction: energy / prevState.energyRequired,
            };
        },
    };
};
