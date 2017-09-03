// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {POWER_CAPACITOR_ID} from './power/capacitor';
import {WATER_TREATMENT_ID} from '../water/treatment';

export const BASE_ID = 'base';

const HOUR_TO_TICK = 3600;

export default function createCore(config: Config): StateMachine {
    const powerRequired = config.value(BASE_ID, 'powerRequired');
    const powerRequiredSilentRunning = config.value(BASE_ID, 'silentRunningPowerRequired');
    const powerRequiredLockdown = config.value(BASE_ID, 'lockdownPowerRequired');
    const drinkingWaterRequired = config.value(BASE_ID, 'drinkingWaterRequired') / HOUR_TO_TICK;
    const drinkingWaterRequiredSilentRunning = config.value(BASE_ID, 'silentRunningDrinkingWaterRequired') / HOUR_TO_TICK;
    const drinkingWaterRequiredLockdown = config.value(BASE_ID, 'lockdownDrinkingWaterRequired') / HOUR_TO_TICK;

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
                    stateMachine: POWER_CAPACITOR_ID,
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
        update(prevState, input, globals) {
            const requiredPower = globals.lockdown ? powerRequiredLockdown : (globals.silentRunning ? powerRequiredSilentRunning : powerRequired);
            const requiredDrinkingWater = globals.lockdown ? drinkingWaterRequiredLockdown : (globals.silentRunning ? drinkingWaterRequiredSilentRunning : drinkingWaterRequired);
            return {
                powerRequired: requiredPower,
                powerSatisfaction: input.power / requiredPower,
                drinkingWaterRequired: requiredDrinkingWater,
                drinkingWaterSatisfaction: input.drinkingWater / requiredDrinkingWater,
            };
        },
    };
};
