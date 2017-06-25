// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {POWER_DISTRIBUTOR_ID} from './power/distributor';

export const BASE_ID = 'base';

export default function createCore(config: Config): StateMachine {
    const powerRequired = config.value(BASE_ID, 'powerRequired');

    return {
        id: BASE_ID,
        initialState() {
            return {
                powerRequired,
                powerConsumed: 0,
                powerSatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    max: prevState.powerRequired,
                },
            ];
        },
        update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: input.power / prevState.powerRequired,
            };
        },
    };
};
