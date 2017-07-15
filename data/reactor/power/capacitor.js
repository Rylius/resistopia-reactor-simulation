// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {POWER_DISTRIBUTOR_ID} from './distributor';

export const POWER_CAPACITOR_ID = 'power-capacitor';

export default function createPowerCapacitor(config: Config): StateMachine {
    const capacity = config.value(POWER_CAPACITOR_ID, 'capacity');
    const initialPower = config.initial(POWER_CAPACITOR_ID, 'power');

    return {
        id: POWER_CAPACITOR_ID,
        public: {
            charge: {
                min: 0,
                max: 1,
            },
        },
        output: ['power'],
        initialState() {
            return {
                capacity: capacity,
                power: initialPower,
                charge: 1,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    max: prevState.charge ? (prevState.capacity - prevState.power) : 0,
                },
                {
                    stateMachine: POWER_CAPACITOR_ID,
                    property: 'power',
                    as: 'storedPower',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            return {
                capacity: prevState.capacity,
                power: input.storedPower + input.power,
                charge: prevState.charge,
            };
        },
    };
}
