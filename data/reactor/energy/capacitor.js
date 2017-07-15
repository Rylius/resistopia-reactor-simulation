// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {ENERGY_DISTRIBUTOR_ID} from './distributor';

export const ENERGY_CAPACITOR_ID = 'energy-capacitor';

export default function createEnergyCapacitor(config: Config): StateMachine {
    const capacity = config.value(ENERGY_CAPACITOR_ID, 'capacity');
    const initialEnergy = config.initial(ENERGY_CAPACITOR_ID, 'energy');

    return {
        id: ENERGY_CAPACITOR_ID,
        output: ['energy'],
        initialState() {
            return {
                capacity: capacity,
                energy: initialEnergy,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'capacitorEnergy',
                    as: 'energy',
                    max: prevState.capacity - prevState.energy,
                },
                {
                    stateMachine: ENERGY_CAPACITOR_ID,
                    property: 'energy',
                    as: 'storedEnergy',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            return {
                capacity: prevState.capacity,
                energy: input.storedEnergy + input.energy,
            };
        },
    };
}
