// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {clamp} from '../../../src/util';

import {REACTOR_ID} from '../reactor';

export const ENERGY_CAPACITOR_ID = 'energy-capacitor';

export default function createEnergyCapacitor(config: Config): StateMachine {
    const capacity = config.value(ENERGY_CAPACITOR_ID, 'capacity');
    const trickleCharge = config.value(ENERGY_CAPACITOR_ID, 'trickleCharge');
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
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    max: prevState.capacity - prevState.energy,
                    priority: -100,
                },
                {
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    as: 'trickleChargeEnergy',
                    max: ((prevState.energy / prevState.capacity) < 1) ? trickleCharge : 0,
                    priority: 10,
                },
                {
                    stateMachine: ENERGY_CAPACITOR_ID,
                    property: 'energy',
                    as: 'storedEnergy',
                    priority: -100,
                },
            ];
        },
        update(prevState, input, globals) {
            const energy = clamp(input.storedEnergy + input.trickleChargeEnergy + input.energy, 0, prevState.capacity);
            globals.storedEnergy = energy / prevState.capacity;
            return {
                capacity: prevState.capacity,
                energy,
            };
        },
    };
}
