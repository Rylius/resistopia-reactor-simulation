// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {POWER_DISTRIBUTOR_ID} from './power/distributor';
import {WATER_TREATMENT_ID} from '../water/treatment';

export const BASE_ID = 'base';

const HOUR_TO_TICK = 3600;

export default function createCore(config: Config): StateMachine {
    const powerRequired = config.value(BASE_ID, 'powerRequired');
    const drinkingWaterRequired = config.value(BASE_ID, 'drinkingWaterRequired') / HOUR_TO_TICK;

    return {
        id: BASE_ID,
        initialState() {
            return {
                powerRequired,
                powerSatisfaction: 0,
                drinkingWaterRequired,
                drinkingWaterSatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    max: prevState.powerRequired,
                },
                {
                    stateMachine: WATER_TREATMENT_ID,
                    property: 'drinkingWater',
                    max: prevState.drinkingWaterRequired,
                },
            ];
        },
        update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerSatisfaction: input.power / prevState.powerRequired,
                drinkingWaterRequired: prevState.drinkingWaterRequired,
                drinkingWaterSatisfaction: input.drinkingWater / prevState.drinkingWaterRequired,
            };
        },
    };
};
