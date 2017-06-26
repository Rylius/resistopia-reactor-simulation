// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp} from '../../src/util';

import {PUMP_IDS} from './pumps';

export const WATER_TANK_ID = 'water-tank';

export default function createWaterTank(config: Config): StateMachine {
    const capacity = config.value(WATER_TANK_ID, 'capacity');
    const initialWater = config.initial(WATER_TANK_ID, 'water');

    return {
        id: WATER_TANK_ID,
        output: ['water'],
        initialState() {
            return {
                capacity,
                water: initialWater,
            };
        },
        input(prevState) {
            return [
                ...PUMP_IDS.map(id => {
                    return {
                        stateMachine: id,
                        property: 'water',
                        as: `water-${id}`,
                    };
                }),
                {
                    // Pipe unused water back into the tank
                    stateMachine: WATER_TANK_ID,
                    property: 'water',
                    as: 'unusedWater',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            let water = input.unusedWater;
            PUMP_IDS.forEach(id => water += input[`water-${id}`]);

            return {
                capacity: prevState.capacity,
                water: clamp(water, 0, prevState.capacity),
            };
        },
    };
}
