// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {POWER_DISTRIBUTOR_ID} from './power/distributor';
import {WATER_TANK_ID} from '../water/tank';
import {REACTOR_ID} from './reactor';

import {clamp} from '../../src/util';

export const COOLING_ID = 'reactor-cooling';

const HOUR_TO_TICK = 3600;

export default function createCooling(config: Config): StateMachine {
    const maxPowerConsumption = config.value(COOLING_ID, 'maxPowerConsumption');
    const maxWaterConsumption = config.value(COOLING_ID, 'maxWaterConsumption') / HOUR_TO_TICK;
    const maxCooling = config.value(COOLING_ID, 'maxCooling');

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
                waterRequired: 0,
                powerSatisfaction: 1,
                waterSatisfaction: 1,
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
                    stateMachine: WATER_TANK_ID,
                    property: 'water',
                    max: prevState.waterRequired,
                    priority: 100,
                },
                {
                    stateMachine: REACTOR_ID,
                    property: 'heat',
                    max: prevState.effectiveCooling,
                },
            ];
        },
        update(prevState, input) {
            const cooling = clamp(prevState.cooling / maxCooling, 0, 1);
            const active = cooling > 0;

            const powerRequired = maxPowerConsumption * cooling;
            const powerSatisfaction = active ? clamp(input.power / powerRequired, 0, 1) : 1;

            // Water consumption depends on pump having enough power
            const waterRequired = maxWaterConsumption * Math.min(cooling, powerSatisfaction);
            const waterSatisfaction = active ? clamp(input.water / (maxWaterConsumption * cooling), 0, 1) : 1;

            const effectiveCooling = active ? prevState.cooling * Math.min(powerSatisfaction, waterSatisfaction) : 0;

            return {
                cooling: prevState.cooling,
                effectiveCooling,
                powerRequired,
                waterRequired,
                powerSatisfaction,
                waterSatisfaction,
            };
        },
    };
};
