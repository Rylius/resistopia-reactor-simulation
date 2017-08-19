// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {POWER_DISTRIBUTOR_ID} from './distributor';

export const POWER_CAPACITOR_ID = 'power-capacitor';

export default function createPowerCapacitor(config: Config): StateMachine {
    const capacity = config.value(POWER_CAPACITOR_ID, 'capacity');
    const generatorThreshold = config.value(POWER_CAPACITOR_ID, 'generatorThreshold');
    const initialPower = config.initial(POWER_CAPACITOR_ID, 'power');

    return {
        id: POWER_CAPACITOR_ID,
        output: ['power'],
        initialState() {
            return {
                capacity: capacity,
                power: initialPower,
                difference: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    max: prevState.capacity - prevState.power,
                },
                {
                    stateMachine: POWER_CAPACITOR_ID,
                    property: 'power',
                    as: 'storedPower',
                    priority: -100,
                },
            ];
        },
        update(prevState, input, globals) {
            const generatorThresholdValue = prevState.capacity * generatorThreshold;
            const power = input.storedPower + input.power;
            globals.generatorRunning = +(power <= generatorThresholdValue);
            return {
                capacity: prevState.capacity,
                power: Math.max(power, generatorThresholdValue),
                difference: power - prevState.power,
            };
        },
    };
}
