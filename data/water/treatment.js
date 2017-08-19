// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp} from '../../src/util';

import {WATER_TANK_ID} from './tank';
import {POWER_CAPACITOR_ID} from '../reactor/power/capacitor';

export const WATER_TREATMENT_ID = 'water-treatment';

const HOUR_TO_TICK = 3600;

export default function createWaterTreatment(config: Config): StateMachine {
    const maxWaterConsumption = config.value(WATER_TREATMENT_ID, 'maxWaterConsumption') / HOUR_TO_TICK;
    const maxPowerConsumption = config.value(WATER_TREATMENT_ID, 'maxPowerConsumption');

    const drinkingWaterCapacity = config.value(WATER_TREATMENT_ID, 'drinkingWaterCapacity');

    const initialDrinkingWater = config.initial(WATER_TREATMENT_ID, 'drinkingWater');
    const initialResourceCleaner = config.initial(WATER_TREATMENT_ID, 'resourceCleaner');
    const initialResourceChlorine = config.initial(WATER_TREATMENT_ID, 'resourceChlorine');
    const initialResourceMinerals = config.initial(WATER_TREATMENT_ID, 'resourceMinerals');

    return {
        id: WATER_TREATMENT_ID,
        output: ['drinkingWater'],
        initialState() {
            return {
                resourceCleaner: initialResourceCleaner,
                resourceChlorine: initialResourceChlorine,
                resourceMinerals: initialResourceMinerals,
                powerSatisfaction: 0,
                requiredWater: 0,
                requiredPower: maxPowerConsumption,
                water: 0,
                drinkingWater: initialDrinkingWater,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: WATER_TANK_ID,
                    property: 'water',
                    max: prevState.requiredWater,
                    priority: 50,
                },
                {
                    stateMachine: POWER_CAPACITOR_ID,
                    property: 'power',
                    max: prevState.requiredPower,
                },
                {
                    stateMachine: WATER_TREATMENT_ID,
                    property: 'drinkingWater',
                    as: 'unusedDrinkingWater',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const totalWater = prevState.water + input.water;
            const powerRequired = (totalWater / maxWaterConsumption) * maxPowerConsumption;
            const powerSatisfaction = powerRequired ? input.power / powerRequired : 0;
            const treatedWater = totalWater * powerSatisfaction;

            const efficiency = treatedWater / maxWaterConsumption;

            const water = Math.max(totalWater - treatedWater, 0);

            const requiredWater = Math.max(maxWaterConsumption - water, 0);
            const requiredPower = clamp((water + requiredWater) / maxWaterConsumption, 0, 1) * maxPowerConsumption;

            return {
                resourceCleaner: Math.max(prevState.resourceCleaner - efficiency, 0),
                resourceChlorine: Math.max(prevState.resourceChlorine - efficiency, 0),
                resourceMinerals: Math.max(prevState.resourceMinerals - efficiency, 0),
                powerSatisfaction: requiredPower > 0 ? powerSatisfaction : 1,
                requiredWater,
                requiredPower,
                water,
                drinkingWater: clamp(input.unusedDrinkingWater + treatedWater, 0, drinkingWaterCapacity),
            };
        },
    };
}
