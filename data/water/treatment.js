// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp} from '../../src/util';

import {WATER_TANK_ID} from './tank';
import {POWER_DISTRIBUTOR_ID} from '../reactor/power/distributor';

export const WATER_TREATMENT_ID = 'water-treatment';

const HOUR_TO_TICK = 3600;

export default function createWaterTreatment(config: Config): StateMachine {
    const maxWaterConsumption = config.value(WATER_TREATMENT_ID, 'maxWaterConsumption') / HOUR_TO_TICK;
    const maxPowerConsumption = config.value(WATER_TREATMENT_ID, 'maxPowerConsumption');

    const drinkingWaterCapacity = config.value(WATER_TREATMENT_ID, 'drinkingWaterCapacity');

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
                water: 0,
                drinkingWater: 0,
            };
        },
        input(prevState) {
            const requiredWater = Math.max(maxWaterConsumption - prevState.water, 0);
            const requiredPower = (requiredWater / maxWaterConsumption) * maxPowerConsumption;

            return [
                {
                    stateMachine: WATER_TANK_ID,
                    property: 'water',
                    max: requiredWater,
                    priority: 50,
                },
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    max: requiredPower,
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
            const water = prevState.water + input.water;
            const powerRequired = (water / maxWaterConsumption) * maxPowerConsumption;
            const powerSatisfaction = powerRequired ? input.power / powerRequired : 1;
            const treatedWater = water * powerSatisfaction;

            const efficiency = treatedWater / maxWaterConsumption;

            return {
                resourceCleaner: Math.max(prevState.resourceCleaner - efficiency, 0),
                resourceChlorine: Math.max(prevState.resourceChlorine - efficiency, 0),
                resourceMinerals: Math.max(prevState.resourceMinerals - efficiency, 0),
                water: Math.max(water - treatedWater, 0),
                drinkingWater: clamp(input.unusedDrinkingWater + treatedWater, 0, drinkingWaterCapacity),
            };
        },
    };
}
