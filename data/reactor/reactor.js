// @flow

import type {StateMachine} from '../../src/program';
import type {Config} from '../be13';

import {clamp, normalizeRange} from '../../src/util';

import {STORAGE_MATTER_ID} from './storage/matter';
import {STORAGE_ANTIMATTER_ID} from './storage/antimatter';

export const REACTOR_ID = 'reactor';

export default function createReactor(config: Config): StateMachine {
    const minTemperature = config.value(REACTOR_ID, 'minTemperature');
    const minOperatingTemperature = config.value(REACTOR_ID, 'minOperatingTemperature');
    const minOptimalTemperature = config.value(REACTOR_ID, 'minOptimalTemperature');
    const maxOptimalTemperature = config.value(REACTOR_ID, 'maxOptimalTemperature');
    const maxOperatingTemperature = config.value(REACTOR_ID, 'maxOperatingTemperature');

    const maxMatterInput = config.value(REACTOR_ID, 'maxMatterInput');
    const maxAntimatterInput = config.value(REACTOR_ID, 'maxAntimatterInput');

    const energyGeneration = config.value(REACTOR_ID, 'maxEnergyGeneration');
    const heatGeneration = config.value(REACTOR_ID, 'maxHeatGeneration');

    const energyToHeat = config.value(REACTOR_ID, 'energyToHeatFactor');

    const shutdownDuration = config.value(REACTOR_ID, 'shutdownDuration');

    const reactorCooling = config.value(REACTOR_ID, 'cooling');

    return {
        id: REACTOR_ID,
        output: ['energy', 'heat'],
        initialState() {
            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                energy: 0,
                energyWasted: 0,
                heat: minTemperature,
            };
        },
        input(prevState) {
            const running = prevState.shutdownRemaining <= 0;

            const maxMatter = Math.min(Math.max(maxMatterInput - prevState.storedMatter, 0), maxMatterInput);
            const maxAntimatter = Math.min(Math.max(maxAntimatterInput - prevState.storedAntimatter, 0), maxAntimatterInput);

            return [
                {
                    stateMachine: STORAGE_MATTER_ID,
                    property: 'releasedMatter',
                    as: 'matter',
                    max: running ? maxMatter : 0,
                },
                {
                    stateMachine: STORAGE_ANTIMATTER_ID,
                    property: 'releasedAntimatter',
                    as: 'antimatter',
                    max: running ? maxAntimatter : 0,
                },
                {
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    priority: -100,
                },
                {
                    stateMachine: REACTOR_ID,
                    property: 'heat',
                    priority: -100,
                },
            ];
        },
        update(prevState, input, globals) {
            const state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                energy: 0,
                energyWasted: input.energy,
                heat: Math.max(input.heat + (input.energy * energyToHeat), minTemperature),
            };

            // Force full shutdown duration as long as reactor heat is above the threshold
            if (state.heat > maxOperatingTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            const running = state.shutdownRemaining <= 0;
            if (running) {
                const requiredMatter = maxMatterInput;
                const requiredAntimatter = maxAntimatterInput;

                const availableMatter = Math.min(state.storedMatter, requiredMatter);
                const availableAntimatter = Math.min(state.storedAntimatter, requiredAntimatter);

                const productivity = Math.max(
                    Math.min(
                        availableMatter / requiredMatter,
                        availableAntimatter / requiredAntimatter,
                        1,
                    ),
                    0,
                );

                let heatEfficiency = 0;
                if (state.heat < minOptimalTemperature) {
                    heatEfficiency = normalizeRange(state.heat, minOperatingTemperature, minOptimalTemperature);
                } else if (state.heat > maxOptimalTemperature) {
                    heatEfficiency = 1 - normalizeRange(state.heat, maxOptimalTemperature, maxOperatingTemperature);
                } else {
                    heatEfficiency = 1;
                }
                heatEfficiency = clamp(heatEfficiency, 0, 1);

                const consumedMatter = requiredMatter * productivity;
                const consumedAntimatter = requiredAntimatter * productivity;

                state.storedMatter -= consumedMatter;
                state.storedAntimatter -= consumedAntimatter;

                state.energy += energyGeneration * productivity * heatEfficiency;
                state.heat += heatGeneration * productivity;
                state.heat -= reactorCooling * productivity;
            }

            return state;
        },
    };
};
