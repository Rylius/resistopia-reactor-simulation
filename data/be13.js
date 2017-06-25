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
import createCooling from './reactor/cooling';
import createCore from './reactor/core';
import createBase from './reactor/base';

export default function createProgramBe13(): Program {
    return {
        stateMachines: [
            createStorageMatter(config), createStorageAntimatter(config),
            createReactor(config),
            createEnergyDistributor(config), createEnergyCapacitor(config), createEnergyConverter(config),
            createPowerDistributor(config),
            createCooling(config),
            createCore(config),
            createBase(config),
        ],
    };
};
