(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global['resistopia-reactor-simulation'] = factory());
}(this, (function () { 'use strict';

function createInitialState(program) {
    var state = {
        tick: 0,
        time: Date.now(),
        stateMachines: {},
        outputs: {},
        inputs: {}
    };

    program.stateMachines.forEach(function (stateMachine) {
        if (stateMachine.initialState) {
            state.stateMachines[stateMachine.id] = stateMachine.initialState();
        } else {
            state.stateMachines[stateMachine.id] = {};
        }

        state.inputs[stateMachine.id] = getInput(stateMachine, state, 0);
    });

    return state;
}

function getInput(stateMachine, prevState) {
    if (!stateMachine.input) {
        return {};
    }

    return stateMachine.input(prevState);
}

function parseInput(prevState, state, stateMachine) {
    var input = {};

    var inputSources = state.inputs[stateMachine.id];
    Object.keys(inputSources).forEach(function (sourceId) {
        var sourceState = state.stateMachines[sourceId] || prevState.stateMachines[sourceId];
        parseInputSource(sourceState, inputSources[sourceId], input, stateMachine.id, sourceId);
    });

    return input;
}

function parseInputSource(sourceState, source, input, parentId, sourceId) {
    var targetProperty = source.as || source.property;
    var max = typeof source.max === 'number' ? source.max : sourceState[source.property];
    var value = Math.min(sourceState[source.property], max);

    // console.log(`${parentId}.${targetProperty}: ${value} from ${sourceId}.${source.property} (${sourceState[source.property]})`);

    if (!source.readOnly) {
        sourceState[source.property] -= value;
    }
    input[targetProperty] = value;
}

function update(program, prevState) {
    var state = {
        tick: prevState.tick + 1,
        time: Date.now(),
        stateMachines: {},
        inputs: {}
    };

    program.stateMachines.forEach(function (stateMachine) {
        state.inputs[stateMachine.id] = getInput(stateMachine, prevState.stateMachines[stateMachine.id]);
    });

    program.stateMachines.forEach(function (stateMachine) {
        state.stateMachines[stateMachine.id] = {};

        if (!stateMachine.update) {
            return;
        }

        var input = parseInput(prevState, state, stateMachine);

        state.stateMachines[stateMachine.id] = stateMachine.update(prevState.stateMachines[stateMachine.id], input);
    });

    // console.log(`tick ${state.tick}`);
    // console.log(state.inputs);
    // console.log('-----------------');
    // console.log(state.stateMachines);
    // console.log('=================');

    return state;
}

function clean(program) {
    program.stateMachines.forEach(function (stateMachine) {
        if (!stateMachine.public) {
            stateMachine.public = {};
        }

        if (!stateMachine.output) {
            stateMachine.output = [];
        }
    });
}

function validate(program) {
    // TODO
}

function normalizeRange(value, min, max) {
    return (value - min) / (max - min);
}

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}

var initial$1 = { "storage-matter": { "matter": 100000000 }, "storage-antimatter": { "antimatter": 100000000 } };
var cooling$1 = { "reactor": 50, "distributor": 50 };
var production$1 = { "reactor": { "maxMatterInput": 500, "maxAntimatterInput": 500, "minTemperature": 25, "minOperatingTemperature": 100, "minOptimalTemperature": 1000, "maxOptimalTemperature": 2000, "maxOperatingTemperature": 5000, "maxPowerGeneration": 300, "maxHeatGeneration": 200, "powerToHeatFactor": 2, "shutdownDuration": 10 }, "distributor": { "minTemperature": 30, "maxTemperature": 200, "powerToHeatFactor": 2, "shutdownDuration": 10 }, "reactor-cooling": { "powerPerCooling": 0.25 } };
var limits = { "core": { "powerRequired": 50 }, "base": { "powerRequired": 75 } };
var data = {
	initial: initial$1,
	cooling: cooling$1,
	production: production$1,
	limits: limits
};

function initial$$1(stateMachine, property, defaultValue) {
    return (data.initial[stateMachine.id] || {})[property] || defaultValue;
}

function cooling$$1(stateMachine, defaultValue) {
    return data.cooling[stateMachine.id] || defaultValue;
}

function production$$1(stateMachine, property, defaultValue) {
    return (data.production[stateMachine.id] || {})[property] || defaultValue;
}

function limit(stateMachine, property, defaultValue) {
    return (data.limits[stateMachine.id] || {})[property] || defaultValue;
}

var prototype = function () {

    var storageMatter = {
        id: 'storage-matter',
        public: {
            releasedMatterPerTick: {
                min: 0,
                max: 500
            }
        },
        output: ['releasedMatter'],
        initialState: function initialState() {
            return {
                matter: initial$$1(storageMatter, 'matter', 100000000),
                releasedMatterPerTick: 0,
                releasedMatter: 0
            };
        },
        update: function update(prevState, input) {
            var releasedMatter = Math.min(prevState.releasedMatterPerTick, prevState.matter);
            return {
                matter: prevState.matter - releasedMatter + prevState.releasedMatter,
                releasedMatterPerTick: prevState.releasedMatterPerTick,
                releasedMatter: releasedMatter
            };
        }
    };
    var storageAntimatter = {
        id: 'storage-antimatter',
        public: {
            releasedAntimatterPerTick: {
                min: 0,
                max: 500
            }
        },
        output: ['releasedAntimatter'],
        initialState: function initialState() {
            return {
                antimatter: initial$$1(storageAntimatter, 'antimatter', 100000000),
                releasedAntimatterPerTick: 0,
                releasedAntimatter: 0
            };
        },
        update: function update(prevState, input) {
            var releasedAntimatter = Math.min(prevState.releasedAntimatterPerTick, prevState.antimatter);
            return {
                antimatter: prevState.antimatter - releasedAntimatter + prevState.releasedAntimatter, // Add back unused product
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter: releasedAntimatter
            };
        }
    };
    var reactor = {
        id: 'reactor',
        output: ['power', 'heat'],
        initialState: function initialState() {
            var minTemperature = production$$1(reactor, 'minTemperature', 25);

            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                power: 0,
                heat: minTemperature
            };
        },
        input: function input(prevState) {
            var maxMatterInput = production$$1(reactor, 'maxMatterInput', 500);
            var maxAntimatterInput = production$$1(reactor, 'maxAntimatterInput', 500);

            var running = prevState.shutdownRemaining <= 0;

            var maxMatter = Math.min(Math.max(maxMatterInput - prevState.storedMatter, 0), maxMatterInput);
            var maxAntimatter = Math.min(Math.max(maxAntimatterInput - prevState.storedAntimatter, 0), maxAntimatterInput);

            return {
                'storage-matter': {
                    property: 'releasedMatter',
                    as: 'matter',
                    max: running ? maxMatter : 0
                },
                'storage-antimatter': {
                    property: 'releasedAntimatter',
                    as: 'antimatter',
                    max: running ? maxAntimatter : 0
                }
            };
        },
        update: function update(prevState, input) {
            var requiredMatter = production$$1(reactor, 'maxMatterInput', 500);
            var requiredAntimatter = production$$1(reactor, 'maxAntimatterInput', 500);
            var powerGeneration = production$$1(reactor, 'maxPowerGeneration', 100);
            var heatGeneration = production$$1(reactor, 'maxHeatGeneration', 100);

            var powerToHeat = production$$1(reactor, 'powerToHeatFactor', 1);

            var minTemperature = production$$1(reactor, 'minTemperature', 25);
            var minOperatingTemperature = production$$1(reactor, 'minOperatingTemperature', 100);
            var minOptimalTemperature = production$$1(reactor, 'minOptimalTemperature', 1000);
            var maxOptimalTemperature = production$$1(reactor, 'maxOptimalTemperature', 2000);
            var maxOperatingTemperature = production$$1(reactor, 'maxOperatingTemperature', 5000);

            var shutdownDuration = production$$1(reactor, 'shutdownDuration', 600);

            var reactorCooling = cooling$$1(reactor, 100);

            var state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                power: 0,
                heat: Math.max(prevState.heat + prevState.power * powerToHeat - reactorCooling, minTemperature)
            };

            // Force full shutdown duration as long as reactor heat is above the threshold
            if (state.heat > maxOperatingTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            var running = state.shutdownRemaining <= 0;
            if (running) {
                var availableMatter = Math.min(state.storedMatter, requiredMatter);
                var availableAntimatter = Math.min(state.storedAntimatter, requiredAntimatter);

                var productivity = Math.max(Math.min(availableMatter / requiredMatter, availableAntimatter / requiredAntimatter, 1), 0);

                var heatEfficiency = 0;
                if (state.heat < minOptimalTemperature) {
                    heatEfficiency = normalizeRange(state.heat, minOperatingTemperature, minOptimalTemperature);
                } else if (state.heat > maxOptimalTemperature) {
                    heatEfficiency = 1 - normalizeRange(state.heat, maxOptimalTemperature, maxOperatingTemperature);
                } else {
                    heatEfficiency = 1;
                }
                heatEfficiency = clamp(heatEfficiency, 0, 1);

                var consumedMatter = requiredMatter * productivity;
                var consumedAntimatter = requiredAntimatter * productivity;

                state.storedMatter -= consumedMatter;
                state.storedAntimatter -= consumedAntimatter;

                state.power += powerGeneration * productivity * heatEfficiency;
                state.heat += heatGeneration * productivity;
            }

            return state;
        }
    };
    var distributor = {
        id: 'distributor',
        output: ['power'],
        initialState: function initialState() {
            var minTemperature = production$$1(distributor, 'minTemperature', 30);

            return {
                cooling: cooling$$1(distributor, 100),
                power: 0,
                heat: minTemperature,
                shutdownRemaining: 0
            };
        },
        input: function input(prevState) {
            var input = {
                'reactor': {
                    property: 'power'
                }
            };

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                input.reactor.max = 0;
            }

            return input;
        },
        update: function update(prevState, input) {
            var minTemperature = production$$1(distributor, 'minTemperature', 30);
            var maxTemperature = production$$1(distributor, 'maxTemperature', 200);
            var generatedHeat = prevState.power * production$$1(distributor, 'powerToHeatFactor', 1);
            var shutdownDuration = production$$1(distributor, 'shutdownDuration', 60);

            var state = {
                cooling: prevState.cooling,
                power: input.power,
                heat: Math.max(prevState.heat + generatedHeat - prevState.cooling, minTemperature),
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0)
            };

            if (state.heat > maxTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            return state;
        }
    };
    var reactorCooling = {
        id: 'reactor-cooling',
        public: {
            cooling: {
                min: 0,
                max: 200
            }
        },
        initialState: function initialState() {
            return {
                cooling: 0,
                effectiveCooling: 0,
                powerRequired: 0,
                powerConsumed: 0,
                powerSatisfaction: 1
            };
        },
        input: function input(prevState) {
            return {
                'distributor': {
                    property: 'power',
                    max: prevState.powerRequired
                },
                'reactor': {
                    property: 'heat',
                    max: prevState.effectiveCooling
                }
            };
        },
        update: function update(prevState, input) {
            var powerPerCooling = production$$1(reactorCooling, 'powerPerCooling', 1);
            var powerRequired = prevState.cooling * powerPerCooling;

            var active = prevState.cooling > 0;
            var powerSatisfaction = active ? input.power / powerRequired : 1;
            var effectiveCooling = active ? prevState.cooling * powerSatisfaction : 0;

            return {
                cooling: prevState.cooling,
                effectiveCooling: effectiveCooling,
                powerRequired: powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: powerSatisfaction
            };
        }
    };
    var core = {
        id: 'core',
        initialState: function initialState() {
            return {
                powerRequired: limit(core, 'powerRequired', 100),
                powerConsumed: 0,
                powerSatisfaction: 0
            };
        },
        input: function input(prevState) {
            return {
                'distributor': {
                    property: 'power',
                    max: prevState.powerRequired
                }
            };
        },
        update: function update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: prevState.powerConsumed / prevState.powerRequired
            };
        }
    };
    var base = {
        id: 'base',
        initialState: function initialState() {
            return {
                powerRequired: limit(base, 'powerRequired', 100),
                powerConsumed: 0,
                powerSatisfaction: 0
            };
        },
        input: function input(prevState) {
            return {
                'distributor': {
                    property: 'power',
                    max: prevState.powerRequired
                }
            };
        },
        update: function update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: prevState.powerConsumed / prevState.powerRequired
            };
        }
    };

    return {
        stateMachines: [storageMatter, storageAntimatter, reactor, distributor, reactorCooling, core, base]
    };
};

var programs = {
    Prototype: prototype()
};

Object.keys(programs).forEach(function (id) {
    var program = programs[id];

    clean(program);
    validate(program);
});

var index = {
    createInitialState: createInitialState,
    update: update,
    Program: programs
};

return index;

})));
