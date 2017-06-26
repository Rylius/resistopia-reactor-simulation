// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp} from '../../src/util';

export const PUMP_IDS = ['pump-a', 'pump-b', 'pump-c'];

const HOUR_TO_TICK = 3600;

function createPump(config: Config, id: string): StateMachine {
    const maxProduction = config.value(id, 'maxProduction') / HOUR_TO_TICK;
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
            };
        },
        update(prevState, input) {
            const efficiency = prevState.enabled ? clamp(prevState.filterHealth / prevState.filterMaxHealth, 0, 1) : 0;

            return {
                maxProduction: prevState.maxProduction,
                enabled: prevState.enabled,
                filterHealth: Math.max(prevState.filterHealth - 1, 0),
                filterMaxHealth: prevState.filterMaxHealth,
                water: prevState.maxProduction * efficiency,
            };
        },
    };
}

export default function createPumps(config: Config): Array<StateMachine> {
    return PUMP_IDS.map(id => createPump(config, id));
}
