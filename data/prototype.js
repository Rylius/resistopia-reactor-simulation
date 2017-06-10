// @flow

import type {Program} from '../src/program';

import {clamp, normalizeRange} from '../src/util';

import data from './prototype.json';

function initial(stateMachine, property, defaultValue): number {
    return (data.initial[stateMachine.id] || {})[property] || defaultValue;
}

function cooling(stateMachine, defaultValue): number {
    return data.cooling[stateMachine.id] || defaultValue;
}

function production(stateMachine, property, defaultValue): number {
    return (data.production[stateMachine.id] || {})[property] || defaultValue;
}

function limit(stateMachine, property, defaultValue): number {
    return (data.limits[stateMachine.id] || {})[property] || defaultValue;
}

export default function (): Program {

    const storageMatter = {
        id: 'storage-matter',
        public: {
            releasedMatterPerTick: {
                min: 0,
                max: 500,
            },
        },
        output: ['releasedMatter'],
        initialState() {
            return {
                matter: initial(storageMatter, 'matter', 100000000),
                releasedMatterPerTick: 0,
                releasedMatter: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: 'storage-matter',
                    property: 'releasedMatter',
                    as: 'unusedMatter',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const releasedMatter = Math.min(prevState.releasedMatterPerTick, prevState.matter);
            return {
                matter: (prevState.matter - releasedMatter) + input.unusedMatter,
                releasedMatterPerTick: prevState.releasedMatterPerTick,
                releasedMatter,
            };
        },
    };
    const storageAntimatter = {
        id: 'storage-antimatter',
        public: {
            releasedAntimatterPerTick: {
                min: 0,
                max: 500,
            },
        },
        output: ['releasedAntimatter'],
        initialState() {
            return {
                antimatter: initial(storageAntimatter, 'antimatter', 100000000),
                releasedAntimatterPerTick: 0,
                releasedAntimatter: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: 'storage-antimatter',
                    property: 'releasedAntimatter',
                    as: 'unusedAntimatter',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const releasedAntimatter = Math.min(prevState.releasedAntimatterPerTick, prevState.antimatter);
            return {
                antimatter: (prevState.antimatter - releasedAntimatter) + input.unusedAntimatter,
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter,
            };
        },
    };
    const reactor = {
        id: 'reactor',
        output: ['energy', 'heat'],
        initialState() {
            const minTemperature = production(reactor, 'minTemperature', 25);

            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                energy: 0,
                heat: minTemperature,
            };
        },
        input(prevState) {
            const maxMatterInput = production(reactor, 'maxMatterInput', 500);
            const maxAntimatterInput = production(reactor, 'maxAntimatterInput', 500);

            const running = prevState.shutdownRemaining <= 0;

            const maxMatter = Math.min(Math.max(maxMatterInput - prevState.storedMatter, 0), maxMatterInput);
            const maxAntimatter = Math.min(Math.max(maxAntimatterInput - prevState.storedAntimatter, 0), maxAntimatterInput);

            return [
                {
                    stateMachine: 'storage-matter',
                    property: 'releasedMatter',
                    as: 'matter',
                    max: running ? maxMatter : 0,
                },
                {
                    stateMachine: 'storage-antimatter',
                    property: 'releasedAntimatter',
                    as: 'antimatter',
                    max: running ? maxAntimatter : 0,
                },
                {
                    stateMachine: 'reactor',
                    property: 'energy',
                    priority: -100,
                },
                {
                    stateMachine: 'reactor',
                    property: 'heat',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const requiredMatter = production(reactor, 'maxMatterInput', 500);
            const requiredAntimatter = production(reactor, 'maxAntimatterInput', 500);
            const energyGeneration = production(reactor, 'maxEnergyGeneration', 100);
            const heatGeneration = production(reactor, 'maxHeatGeneration', 100);

            const energyToHeat = production(reactor, 'energyToHeatFactor', 1);

            const minTemperature = production(reactor, 'minTemperature', 25);
            const minOperatingTemperature = production(reactor, 'minOperatingTemperature', 100);
            const minOptimalTemperature = production(reactor, 'minOptimalTemperature', 1000);
            const maxOptimalTemperature = production(reactor, 'maxOptimalTemperature', 2000);
            const maxOperatingTemperature = production(reactor, 'maxOperatingTemperature', 5000);

            const shutdownDuration = production(reactor, 'shutdownDuration', 60);

            const reactorCooling = cooling(reactor, 100);

            const state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                energy: 0,
                heat: Math.max(input.heat + (input.energy * energyToHeat) - reactorCooling, minTemperature),
            };

            // Force full shutdown duration as long as reactor heat is above the threshold
            if (state.heat > maxOperatingTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            const running = state.shutdownRemaining <= 0;
            if (running) {
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
            }

            return state;
        },
    };
    const energyDistributor = {
        id: 'energy-distributor',
        public: {
            converterWeight: {
                min: 0,
                max: 1,
            },
            capacitorWeight: {
                min: 0,
                max: 1,
            },
            coreWeight: {
                min: 0,
                max: 1,
            },
        },
        output: ['converterEnergy', 'capacitorEnergy', 'coreEnergy'],
        initialState() {
            return {
                unusedEnergy: 0,
                converterEnergy: 0,
                capacitorEnergy: 0,
                coreEnergy: 0,
                converterWeight: 1,
                capacitorWeight: 1,
                coreWeight: 1,
            };
        },
        input(prevState) {
            const maxInput = (production(energyDistributor, 'outputBuffer') * 3) - prevState.unusedEnergy;
            return [
                {
                    stateMachine: reactor.id,
                    property: 'energy',
                    max: maxInput,
                },
                {
                    stateMachine: energyDistributor.id,
                    property: 'converterEnergy',
                    priority: -100,
                },
                {
                    stateMachine: energyDistributor.id,
                    property: 'capacitorEnergy',
                    priority: -100,
                },
                {
                    stateMachine: energyDistributor.id,
                    property: 'coreEnergy',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const outputBuffer = production(energyDistributor, 'outputBuffer');

            let converterBuffer = input.converterEnergy;
            let capacitorBuffer = input.capacitorEnergy;
            let coreBuffer = input.coreEnergy;

            let energy = prevState.unusedEnergy + input.energy;

            let iterations = 0;
            while (energy > 0 && iterations < 10) {
                iterations++;

                const converterBufferFull = converterBuffer >= outputBuffer;
                const capacitorBufferFull = capacitorBuffer >= outputBuffer;
                const coreBufferFull = coreBuffer >= outputBuffer;
                if (converterBufferFull && capacitorBufferFull && coreBufferFull) {
                    break;
                }

                const weightTotal = (converterBufferFull ? 0 : prevState.converterWeight) + (capacitorBufferFull ? 0 : prevState.capacitorWeight ) + (coreBufferFull ? 0 : prevState.coreWeight);
                if (weightTotal <= 0) {
                    break;
                }

                if (!coreBufferFull && prevState.coreWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - coreBuffer, Math.max(energy * (prevState.coreWeight / weightTotal), 1), energy);
                    coreBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
                if (!converterBufferFull && prevState.converterWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - converterBuffer, Math.max(energy * (prevState.converterWeight / weightTotal), 1), energy);
                    converterBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
                if (!capacitorBufferFull && prevState.capacitorWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - capacitorBuffer, Math.max(energy * (prevState.capacitorWeight / weightTotal), 1), energy);
                    capacitorBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
            }

            return {
                unusedEnergy: energy,
                converterEnergy: converterBuffer,
                capacitorEnergy: capacitorBuffer,
                coreEnergy: coreBuffer,
                converterWeight: prevState.converterWeight,
                capacitorWeight: prevState.capacitorWeight,
                coreWeight: prevState.coreWeight,
            };
        },
    };
    const energyConverter = {
        id: 'energy-converter',
        public: {
            energyConversion: {
                min: 0,
                max: production({id: 'energy-converter'}, 'maxConversion'),
            },
        },
        output: ['power', 'energy'],
        initialState() {
            return {
                energy: 0,
                energyConversion: 0,
                power: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: energyDistributor.id,
                    property: 'converterEnergy',
                    as: 'energy',
                    max: prevState.energyConversion,
                },
            ];
        },
        update(prevState, input) {
            const energyToPower = production(energyConverter, 'energyToPowerFactor', 1);
            return {
                energy: input.energy,
                energyConversion: prevState.energyConversion,
                power: input.energy * energyToPower,
            };
        },
    };
    const distributor = {
        id: 'distributor',
        output: ['power', 'heat'],
        initialState() {
            const minTemperature = production(distributor, 'minTemperature', 30);

            return {
                cooling: cooling(distributor, 100),
                power: 0,
                heat: minTemperature,
                shutdownRemaining: 0,
            };
        },
        input(prevState) {
            const input = [
                {
                    stateMachine: energyConverter.id,
                    property: 'power',
                    max: Infinity,
                    priority: 100,
                },
                {
                    stateMachine: distributor.id,
                    property: 'power',
                    as: 'unusedPower',
                    priority: -100,
                },
                {
                    stateMachine: distributor.id,
                    property: 'heat',
                    priority: 100,
                },
            ];

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                // FIXME
                input[0].max = 0;
            }

            return input;
        },
        update(prevState, input) {
            const minTemperature = production(distributor, 'minTemperature', 30);
            const maxTemperature = production(distributor, 'maxTemperature', 200);
            const generatedHeat = input.unusedPower * production(distributor, 'powerToHeatFactor', 1);
            const shutdownDuration = production(distributor, 'shutdownDuration', 60);

            const state = {
                cooling: prevState.cooling,
                power: input.power,
                heat: Math.max((input.heat + generatedHeat) - prevState.cooling, minTemperature),
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
            };

            if (state.heat > maxTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            return state;
        },
    };
    const reactorCooling = {
        id: 'reactor-cooling',
        public: {
            cooling: {
                min: 0,
                max: 200,
            },
        },
        initialState() {
            return {
                cooling: 0,
                effectiveCooling: 0,
                powerRequired: 0,
                powerConsumed: 0,
                powerSatisfaction: 1,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: distributor.id,
                    property: 'power',
                    max: prevState.powerRequired,
                },
                {
                    stateMachine: reactor.id,
                    property: 'heat',
                    max: prevState.effectiveCooling,
                },
            ];
        },
        update(prevState, input) {
            const powerPerCooling = production(reactorCooling, 'powerPerCooling', 1);
            const powerRequired = prevState.cooling * powerPerCooling;

            const active = prevState.cooling > 0;
            const powerSatisfaction = active ? input.power / powerRequired : 1;
            const effectiveCooling = active ? prevState.cooling * powerSatisfaction : 0;

            return {
                cooling: prevState.cooling,
                effectiveCooling,
                powerRequired,
                powerConsumed: input.power,
                powerSatisfaction,
            };
        },
    };
    const core = {
        id: 'core',
        initialState() {
            return {
                energyRequired: limit(core, 'energyRequired', 100),
                energyConsumed: 0,
                energySatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: energyDistributor.id,
                    property: 'coreEnergy',
                    as: 'energy',
                    max: prevState.energyRequired,
                },
            ];
        },
        update(prevState, input) {
            return {
                energyRequired: prevState.energyRequired,
                energyConsumed: input.energy,
                energySatisfaction: input.energy / prevState.energyRequired,
            };
        },
    };
    const base = {
        id: 'base',
        initialState() {
            return {
                powerRequired: limit(base, 'powerRequired', 100),
                powerConsumed: 0,
                powerSatisfaction: 0,
            };
        },
        input(prevState) {
            return [
                {
                    stateMachine: distributor.id,
                    property: 'power',
                    max: prevState.powerRequired,
                },
            ];
        },
        update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: input.power / prevState.powerRequired,
            };
        },
    };

    return {
        stateMachines: [
            storageMatter, storageAntimatter,
            reactor, energyDistributor,
            energyConverter,
            distributor, reactorCooling, core, base,
        ],
    };
}
;
