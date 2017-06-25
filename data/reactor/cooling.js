// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {POWER_DISTRIBUTOR_ID} from './power/distributor';
import {REACTOR_ID} from './reactor';

export const COOLING_ID = 'reactor-cooling';

export default function createCooling(config: Config): StateMachine {
    const maxCooling = config.value(COOLING_ID, 'maxCooling');
    const powerPerCooling = config.value(COOLING_ID, 'powerPerCooling');

    return {
        id: COOLING_ID,
        public: {
            cooling: {
                min: 0,
                max: maxCooling,
            },
        },
        initialState() {
            return {
                cooling: 0,
                effectiveCooling: 0,
                powerRequired: 0,
                powerConsumed: 0,
                powerSatisfaction: 1,
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
                    stateMachine: REACTOR_ID,
                    property: 'heat',
                    max: prevState.effectiveCooling,
                },
            ];
        },
        update(prevState, input) {
            const powerRequired = prevState.cooling * powerPerCooling;

            const active = prevState.cooling > 0;
            const powerSatisfaction = active ? input.power / powerRequired : 1;
            const effectiveCooling = active ? prevState.cooling * powerSatisfaction : 0;

            return {
                cooling: prevState.cooling,
                effectiveCooling,
                powerRequired,
                powerConsumed: input.power,
                powerSatisfaction,
            };
        },
    };
};
