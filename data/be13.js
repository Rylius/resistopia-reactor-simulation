// @flow

import type {Program} from '../src/program';

import {initialValue, configValue} from '../src/config';
import be13 from './be13.json';

const config = {
    initial(stateMachine: string, property: string) {
        return initialValue(be13, stateMachine, property);
    },
    value(stateMachine: string, property: string) {
        return configValue(be13, stateMachine, property);
    },
};
export type Config = typeof config

import createStorageMatter from './reactor/storage/matter';
import createStorageAntimatter from './reactor/storage/antimatter';
import createReactor from './reactor/reactor';
import createEnergyDistributor from './reactor/energy/distributor';
import createEnergyConverter from './reactor/energy/converter';
import createEnergyCapacitor from './reactor/energy/capacitor';
import createPowerDistributor from './reactor/power/distributor';
import createPowerCapacitor from './reactor/power/capacitor';
import createCooling from './reactor/cooling';
import createCore from './reactor/core';
import createBase from './reactor/base';
import createPumps from './water/pumps';
import createWaterTank from './water/tank';
import createWaterTreatment from './water/treatment';

export default function createProgramBe13(): Program {
    return {
        globals: {
            effects: 1, // Sound/light, not really used in the simulation itself
            lockdown: 0,
            silentRunning: 0,
            camouflage: 1,
            camouflageEnergyRequired: 0,
            storedEnergy: 0,
            disableReactorCooling: 0,
            generatorRunning: 0,
            resetMatterInput: 0,
            resetAntimatterInput: 0,
        },
        stateMachines: [
            createStorageMatter(config), createStorageAntimatter(config),
            createReactor(config),
            createEnergyCapacitor(config), createEnergyConverter(config),
            createPowerDistributor(config), createPowerCapacitor(config),
            createCooling(config),
            createCore(config),
            createBase(config),
            ...createPumps(config), createWaterTank(config), createWaterTreatment(config),
        ],
    };
};
