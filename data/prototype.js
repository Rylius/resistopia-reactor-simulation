import data from './prototype.json';

function initial(stateMachine, property, defaultValue) {
    return (data.initial[stateMachine.id] || {})[property] || defaultValue;
}

function cooling(stateMachine, defaultValue) {
    return data.cooling[stateMachine.id] || defaultValue;
}

function production(stateMachine, property, defaultValue) {
    return (data.production[stateMachine.id] || {})[property] || defaultValue;
}

function limit(stateMachine, property, defaultValue) {
    return (data.limits[stateMachine.id] || {})[property] || defaultValue;
}

export default function () {

    const storageMatter = {
        id: 'storage-matter',
        initialState() {
            return {
                matter: initial(storageMatter, 'matter', 100000000),
                releasedMatterPerTick: 0,
                releasedMatter: 0,
            }
        },
        update(prevState, input) {
            const releasedMatter = Math.min(prevState.releasedMatterPerTick, prevState.matter);
            return {
                matter: prevState.matter - releasedMatter,
                releasedMatterPerTick: prevState.releasedMatterPerTick,
                releasedMatter,
            };
        },
    };
    const storageAntimatter = {
        id: 'storage-antimatter',
        initialState() {
            return {
                antimatter: initial(storageAntimatter, 'antimatter', 100000000),
                releasedAntimatterPerTick: 0,
                releasedAntimatter: 0,
            }
        },
        update(prevState, input) {
            const releasedAntimatter = Math.min(prevState.releasedAntimatterPerTick, prevState.antimatter);
            return {
                antimatter: prevState.antimatter - releasedAntimatter,
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter,
            };
        },
    };
    const reactor = {
        id: 'reactor',
        initialState() {
            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                power: 0,
                heat: 0,
            };
        },
        input(prevState) {
            const running = prevState.shutdownRemaining <= 0;

            const maxMatter = production(reactor, 'maxMatterInput', 1000);
            const maxAntimatter = production(reactor, 'maxAntimatterInput', 1000);

            return {
                'storage-matter': {
                    property: 'releasedMatter',
                    as: 'matter',
                    max: running ? maxMatter : 0,
                },
                'storage-antimatter': {
                    property: 'releasedAntimatter',
                    as: 'antimatter',
                    max: running ? maxAntimatter : 0,
                },
            };
        },
        update(prevState, input) {
            const requiredMatter = production(reactor, 'maxMatterConsumption', 100);
            const requiredAntimatter = production(reactor, 'maxAntimatterConsumption', 100);
            const powerGeneration = production(reactor, 'maxPowerGeneration', 100);
            const heatGeneration = production(reactor, 'maxHeatGeneration', 100);

            const powerToHeat = production(reactor, 'powerToHeatFactor', 1);

            const heatTolerance = production(reactor, 'heatTolerance', 2000);
            const heatShutdownThreshold = production(reactor, 'heatShutdownThreshold', 5000);

            const shutdownDuration = production(reactor, 'shutdownDuration', 600);

            const state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                power: 0,
                heat: prevState.heat + (prevState.power * powerToHeat),
            };

            // Force full shutdown duration as long as reactor heat is above the threshold
            if (state.heat > heatShutdownThreshold) {
                state.shutdownRemaining = shutdownDuration;
            }

            const running = state.shutdownRemaining <= 0;
            if (running) {
                const availableMatter = Math.min(state.storedMatter, requiredMatter,);
                const availableAntimatter = Math.min(state.storedAntimatter, requiredAntimatter,);

                let productivity = Math.max(
                    Math.min(
                        availableMatter / requiredMatter,
                        availableAntimatter / requiredAntimatter,
                        heatShutdownThreshold / heatGeneration,
                        1,
                    ),
                    0,
                );

                const consumedMatter = requiredMatter * productivity;
                const consumedAntimatter = requiredAntimatter * productivity;

                state.storedMatter -= consumedMatter;
                state.storedAntimatter -= consumedAntimatter;

                state.power += powerGeneration * productivity;
                state.heat += heatGeneration * productivity;
            }

            return state;
        },
    };
    const reactorCooling = {
        id: 'reactor-cooling',
        initialState() {
            return {
                cooling: 0,
            };
        },
        input(prevState) {
            return {
                'reactor': {
                    property: 'heat',
                    max: prevState.cooling,
                },
            };
        },
        update(prevState, input) {
            return {
                cooling: prevState.cooling,
            };
        },
    };
    const distributor = {
        id: 'distributor',
        initialState() {
            return {
                cooling: cooling(distributor, 100),
                power: 0,
                heat: 0,
                shutdownRemaining: 0,
            };
        },
        input(prevState) {
            const input = {
                'reactor': {
                    property: 'power',
                },
            };

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                input.reactor.max = 0;
            }

            return input;
        },
        update(prevState, input) {
            const generatedHeat = prevState.power * production(distributor, 'powerToHeatFactor', 1);
            const heatTolerance = production(distributor, 'heatTolerance', 200);
            const shutdownDuration = production(distributor, 'shutdownDuration', 60);

            const state = {
                cooling: prevState.cooling,
                power: input.power,
                heat: prevState.heat + generatedHeat,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
            };

            state.heat -= Math.min(state.cooling, state.heat);

            if (state.heat > heatTolerance) {
                state.shutdownRemaining = shutdownDuration;
            }

            return state;
        },
    };
    const core = {
        id: 'core',
        initialState() {
            return {
                powerRequired: limit(core, 'powerRequired', 100),
                powerConsumed: 0,
                powerSatisfaction: 0,
            };
        },
        input(prevState) {
            return {
                'distributor': {
                    property: 'power',
                    max: prevState.powerRequired,
                },
            };
        },
        update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: prevState.powerConsumed / prevState.powerRequired,
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
            return {
                'distributor': {
                    property: 'power',
                    max: prevState.powerRequired,
                },
            };
        },
        update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: prevState.powerConsumed / prevState.powerRequired,
            };
        },
    };

    return {
        stateMachines: [
            storageMatter, storageAntimatter,
            reactor, reactorCooling,
            distributor, core, base,
        ],
    };
}
;
