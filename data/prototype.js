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
                releasedMatterPerSecond: 0,
                releasedMatter: 0,
            }
        },
        consumers: ['reactor'],
        update(prevState, input, seconds) {
            const releasedMatter = Math.min(prevState.releasedMatterPerSecond * seconds, prevState.matter);
            return {
                matter: prevState.matter - releasedMatter,
                releasedMatter,
                releasedMatterPerSecond: prevState.releasedMatterPerSecond,
            };
        },
    };
    const storageAntimatter = {
        id: 'storage-antimatter',
        initialState() {
            return {
                antimatter: initial(storageAntimatter, 'antimatter', 100000000),
                releasedAntimatter: 0,
                releasedAntimatterPerSecond: 0,
            }
        },
        update(prevState, input, seconds) {
            const releasedAntimatter = Math.min(prevState.releasedAntimatterPerSecond * seconds, prevState.antimatter);
            return {
                antimatter: prevState.antimatter - releasedAntimatter,
                releasedAntimatter,
                releasedAntimatterPerSecond: prevState.releasedAntimatterPerSecond,
            };
        },
    };
    const reactor = {
        id: 'reactor',
        initialState() {
            return {
                storedMatter: 0,
                storedAntimatter: 0,
                generatedHeat: 0,
                generatedPower: 0,
            };
        },
        input(prevState, seconds) {
            const maxMatter = production(reactor, 'maxMatterInput', 1000) * seconds;
            const maxAntimatter = production(reactor, 'maxAntimatterInput', 1000) * seconds;

            return {
                'storage-matter': {
                    property: 'releasedMatter',
                    as: 'matter',
                    max: maxMatter,
                },
                'storage-antimatter': {
                    property: 'releasedAntimatter',
                    as: 'antimatter',
                    max: maxAntimatter,
                },
            };
        },
        update(prevState, input, seconds) {
            const requiredMatter = production(reactor, 'maxMatterConsumption', 100) * seconds;
            const requiredAntimatter = production(reactor, 'maxAntimatterConsumption', 100) * seconds;
            const powerGeneration = production(reactor, 'maxPowerGeneration', 100) * seconds;
            const heatGeneration = production(reactor, 'maxHeatGeneration', 100) * seconds;

            const state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                generatedPower: 0,
                generatedHeat: 0,
            };

            const availableMatter = Math.min(state.storedMatter, requiredMatter,);
            const availableAntimatter = Math.min(state.storedAntimatter, requiredAntimatter,);

            const productivity = Math.max(
                Math.min(
                    availableMatter / requiredMatter,
                    availableAntimatter / requiredAntimatter,
                    1,
                ),
                0,
            );

            const consumedMatter = requiredMatter * productivity;
            const consumedAntimatter = requiredAntimatter * productivity;

            state.storedMatter -= consumedMatter;
            state.storedAntimatter -= consumedAntimatter;

            state.generatedPower = powerGeneration * productivity;
            state.generatedHeat = heatGeneration * productivity;

            return state;
        },
    };
    const reactorHeat = {
        id: 'reactor-heat',
        initialState() {
            return {
                storedHeat: 0,
                coolingPerSecond: cooling(reactorHeat, 100),
            };
        },
        input(prevState, seconds) {
            return {
                'reactor': {
                    property: 'generatedHeat',
                    as: 'heat',
                },
            };
        },
        update(prevState, input, seconds) {
            const state = {
                storedHeat: prevState.storedHeat + input.heat,
                coolingPerSecond: prevState.coolingPerSecond,
            };

            state.storedHeat -= Math.min(state.coolingPerSecond * seconds, state.storedHeat);

            return state;
        },
    };
    const core = {
        id: 'core',
        initialState() {
            return {
                powerRequired: limit(core, 'powerRequired', 100),
                seconds: 1,
                powerConsumedPerSecond: 0,
                powerSatisfaction: 0,
            };
        },
        input(prevState, seconds) {
            return {
                'reactor': {
                    property: 'generatedPower',
                    as: 'power',
                    max: prevState.powerRequired * seconds,
                },
            };
        },
        update(prevState, input, seconds) {
            return {
                powerRequired: prevState.powerRequired,
                seconds: seconds,
                powerConsumedPerSecond: input.power / prevState.seconds,
                powerSatisfaction: (prevState.powerConsumedPerSecond) / prevState.powerRequired,
            };
        },
    };
    const base = {
        id: 'base',
        initialState() {
            return {
                powerRequired: limit(base, 'powerRequired', 100),
                seconds: 1,
                powerConsumedPerSecond: 0,
                powerSatisfaction: 0,
            };
        },
        input(prevState, seconds) {
            return {
                'reactor': {
                    property: 'generatedPower',
                    as: 'power',
                    max: prevState.powerRequired * seconds,
                },
            };
        },
        update(prevState, input, seconds) {
            return {
                powerRequired: prevState.powerRequired,
                seconds: seconds,
                powerConsumedPerSecond: input.power / prevState.seconds,
                powerSatisfaction: (prevState.powerConsumedPerSecond) / prevState.powerRequired,
            };
        },
    };
    const distributorHeat = {
        id: 'distributor-heat',
        initialState() {
            return {
                coolingPerSecond: cooling(distributorHeat, 100),
                heat: 0,
            };
        },
        input(prevState, seconds) {
            return {
                'reactor': {
                    property: 'generatedPower',
                    as: 'power',
                },
            };
        },
        update(prevState, input, seconds) {
            const generatedHeat = input.power * production(distributorHeat, 'powerToHeatFactor', 1);

            const state = {
                coolingPerSecond: prevState.coolingPerSecond,
                heat: prevState.heat + generatedHeat,
            };

            state.heat -= Math.min(state.coolingPerSecond * seconds, state.heat);

            return state;
        },
    };

    return {
        stateMachines: [
            storageMatter, storageAntimatter,
            reactor, reactorHeat,
            core, base, distributorHeat,
        ],
    };
}
;
