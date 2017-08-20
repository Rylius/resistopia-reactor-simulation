// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp, randomInRange} from '../../src/util';

import {REACTOR_ID} from './reactor';
import {ENERGY_CAPACITOR_ID} from './energy/capacitor';

export const CORE_ID = 'core';

export default function createCore(config: Config): StateMachine {
    const minEnergyRequired = config.value(CORE_ID, 'minEnergyRequired');
    const maxEnergyRequired = config.value(CORE_ID, 'maxEnergyRequired');
    const minEnergyChangeInterval = config.value(CORE_ID, 'minEnergyChangeInterval');
    const maxEnergyChangeInterval = config.value(CORE_ID, 'maxEnergyChangeInterval');
    const nanitesConsumption = config.value(CORE_ID, 'nanitesConsumption');
    const nanitesRegeneration = config.value(CORE_ID, 'nanitesRegeneration');
    const nanitesCapacity = config.value(CORE_ID, 'nanitesCapacity');

    const initialNanites = config.initial(CORE_ID, 'nanites');

    function updateEnergyRequired() {
        return randomInRange(minEnergyRequired, maxEnergyRequired);
    }

    function updateNextEnergyChange() {
        return Math.floor(randomInRange(minEnergyChangeInterval, maxEnergyChangeInterval));
    }

    return {
        id: CORE_ID,
        initialState() {
            return {
                energyRequired: 0,
                nextEnergyChange: 0,
                nanites: initialNanites,
                nanitesCapacity,
                energyConsumed: 0,
                energyFromReactor: 0,
                energyFromCapacitor: 0,
                energyMissing: 0,
                energySatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    max: prevState.energyRequired,
                    priority: 100,
                },
                {
                    stateMachine: ENERGY_CAPACITOR_ID,
                    property: 'energy',
                    as: 'capacitorEnergy',
                    max: Math.max(prevState.energyRequired - prevState.energyFromReactor, 0),
                },
            ];
        },
        update(prevState, input, globals) {
            const disabled = !globals.camouflage || prevState.nanites <= 0;

            let energyRequired = prevState.energyRequired;
            let nextEnergyChange = Math.max(prevState.nextEnergyChange - 1, 0);

            if (disabled) {
                energyRequired = 0;
            } else if (nextEnergyChange <= 0) {
                energyRequired = updateEnergyRequired();
                nextEnergyChange = updateNextEnergyChange();
                globals.resetMatterInput = 1;
                globals.resetAntimatterInput = 1;
            }

            globals.camouflageEnergyRequired = energyRequired;

            // It's possible we drew too much energy in one tick, so discard any excess
            const energy = Math.min(input.energy + input.capacitorEnergy, energyRequired);

            return {
                energyRequired,
                nextEnergyChange,
                nanites: clamp(prevState.nanites + (globals.camouflage ? nanitesRegeneration : -nanitesConsumption), 0, prevState.nanitesCapacity),
                nanitesCapacity: prevState.nanitesCapacity,
                energyConsumed: energy,
                energyFromReactor: input.energy,
                energyFromCapacitor: input.capacitorEnergy,
                energyMissing: Math.max(prevState.energyRequired - energy, 0),
                energySatisfaction: disabled ? 1 : energy / prevState.energyRequired,
            };
        },
    };
};
