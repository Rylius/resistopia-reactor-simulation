// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp} from '../../src/util';

import {POWER_CAPACITOR_ID} from '../reactor/power/capacitor';

export const PUMP_IDS = ['pump-a', 'pump-b', 'pump-c'];

const HOUR_TO_TICK = 3600;

function createPump(config: Config, id: string): StateMachine {
    const maxProduction = config.value(id, 'maxProduction') / HOUR_TO_TICK;
    const powerConsumption = config.value(id, 'powerConsumption') / HOUR_TO_TICK;

    const initiallyEnabled = config.initial(id, 'enabled');
    const filterHealth = config.initial(id, 'filterHealth');
    const filterMaxHealth = config.initial(id, 'filterMaxHealth');

    return {
        id: id,
        public: {
            enabled: {
                min: 0,
                max: 1,
            },
        },
        output: ['water'],
        initialState() {
            return {
                maxProduction,
                enabled: initiallyEnabled,
                filterHealth,
                filterMaxHealth,
                water: 0,
                powerRequired: powerConsumption,
                powerSatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: POWER_CAPACITOR_ID,
                    property: 'power',
                    max: prevState.powerRequired,
                },
            ];
        },
        update(prevState, input) {
            const powerSatisfaction = clamp(input.power / powerConsumption, 0, 1);
            const efficiency = prevState.enabled ? clamp((prevState.filterHealth / prevState.filterMaxHealth) * powerSatisfaction, 0, 1) : 0;

            return {
                maxProduction: prevState.maxProduction,
                enabled: prevState.enabled ? 1 : 0,
                filterHealth: prevState.enabled ? Math.max(prevState.filterHealth - 1, 0) : prevState.filterHealth,
                filterMaxHealth: prevState.filterMaxHealth,
                water: prevState.maxProduction * efficiency,
                powerRequired: prevState.enabled ? powerConsumption : 0,
                powerSatisfaction,
            };
        },
    };
}

export default function createPumps(config: Config): Array<StateMachine> {
    return PUMP_IDS.map(id => createPump(config, id));
}
