(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global['resistopia-reactor-simulation'] = factory());
}(this, (function () { 'use strict';

// FIXME Should be number, but Flow keeps complaining for whatever reason
function createInitialState(program) {
    var state = {
        tick: 0,
        time: Date.now(),
        globals: program.globals,
        stateMachines: {}
    };

    program.stateMachines.forEach(function (stateMachine) {
        if (stateMachine.initialState) {
            state.stateMachines[stateMachine.id] = stateMachine.initialState();
        } else {
            state.stateMachines[stateMachine.id] = {};
        }
    });

    return state;
}

function inputRequestsFor(stateMachine, prevState) {
    if (!stateMachine.input) {
        return [];
    }

    return stateMachine.input(prevState);
}

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

function failInputRequest(stateMachine, request, message) {
    return new Error('Failed to process input request of "' + stateMachine.id + '" for "' + request.stateMachine + '.' + request.property + '": ' + message);
}

function inputRequestComparator(a, b) {
    var priorityA = typeof a.priority === 'undefined' ? 0 : a.priority;
    var priorityB = typeof b.priority === 'undefined' ? 0 : b.priority;

    if (priorityA === priorityB) {
        return 0;
    }
    return priorityA < priorityB ? 1 : -1;
}

function processInputRequests(program, outputs, inputRequests, inputs) {
    inputRequests.forEach(function (request) {
        var stateMachine = request._target;
        if (!stateMachine) {
            throw new Error('Invalid input request: No target set');
        }

        var sourceStateMachine = program.stateMachines.find(function (machine) {
            return machine.id === request.stateMachine;
        });
        if (!sourceStateMachine) {
            throw failInputRequest(stateMachine, request, 'Source state machine does not exist');
        }
        if (!sourceStateMachine.output || !sourceStateMachine.output.includes(request.property)) {
            throw failInputRequest(stateMachine, request, 'Requested property is not declared as an output property');
        }

        var output = outputs[request.stateMachine];
        if (!output) {
            throw failInputRequest(stateMachine, request, 'Source state machine did not produce any output');
        }
        var outputValue = output[request.property];
        if (typeof outputValue === 'undefined') {
            throw failInputRequest(stateMachine, request, 'Source state machine did not produce output for requested property');
        }

        var max = typeof request.max === 'number' ? request.max : outputValue;
        var value = Math.min(outputValue, max);

        output[request.property] -= value;

        var targetProperty = request.as || request.property;
        inputs[stateMachine.id][targetProperty] = value;

        // console.log(`${stateMachine.id} consumed ${value} from ${sourceStateMachine.id}.${request.property} as ${targetProperty}`);
    });
}

function update(program, prevState) {
    var state = {
        tick: prevState.tick + 1,
        time: Date.now(),
        globals: prevState.globals,
        stateMachines: {}
    };

    var outputs = {};
    var inputs = {};
    var allInputRequests = [];
    program.stateMachines.forEach(function (stateMachine) {
        // Gather all input requests this state machine created
        var requests = inputRequestsFor(stateMachine, prevState.stateMachines[stateMachine.id]);
        requests.forEach(function (request) {
            return request._target = stateMachine;
        });
        allInputRequests.push.apply(allInputRequests, toConsumableArray(requests));

        inputs[stateMachine.id] = {};

        if (!stateMachine.output) {
            return;
        }

        // Copy output properties from previous tick
        outputs[stateMachine.id] = {};
        // $FlowFixMe
        stateMachine.output.forEach(function (property) {
            outputs[stateMachine.id][property] = prevState.stateMachines[stateMachine.id][property];
        });
    });

    // Process input requests
    program.stateMachines.forEach(function (stateMachine) {
        var requests = allInputRequests.filter(function (request) {
            return request.stateMachine === stateMachine.id;
        }) // Group by source state machine
        .sort(inputRequestComparator); // Sort by priority

        processInputRequests(program, outputs, requests, inputs);
    });

    program.stateMachines.forEach(function (stateMachine) {
        state.stateMachines[stateMachine.id] = {};

        if (!stateMachine.update) {
            return;
        }

        state.stateMachines[stateMachine.id] = stateMachine.update(prevState.stateMachines[stateMachine.id], inputs[stateMachine.id], state.globals);
    });

    // console.log(`tick ${state.tick}`);
    // console.log(state.inputs);
    // console.log('-----------------');
    // console.log(state.stateMachines);
    // console.log('=================');

    return state;
}

function normalizeRange(value, min, max) {
    return (value - min) / (max - min);
}

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

var initial$1 = { "storage-matter": { "matter": 100000000 }, "storage-antimatter": { "antimatter": 100000000 } };
var cooling$1 = { "reactor": 50, "distributor": 50 };
var production$1 = { "reactor": { "maxMatterInput": 500, "maxAntimatterInput": 500, "minTemperature": 25, "minOperatingTemperature": 100, "minOptimalTemperature": 1000, "maxOptimalTemperature": 2000, "maxOperatingTemperature": 5000, "maxEnergyGeneration": 300, "maxHeatGeneration": 200, "energyToHeatFactor": 2, "shutdownDuration": 10 }, "energy-distributor": { "outputBuffer": 200 }, "energy-converter": { "maxConversion": 100, "energyToPowerFactor": 1 }, "distributor": { "minTemperature": 30, "maxTemperature": 200, "powerToHeatFactor": 2, "shutdownDuration": 10 }, "reactor-cooling": { "powerPerCooling": 0.25 } };
var limits = { "energy-capacitor": { "capacity": 270000 }, "core": { "energyRequired": 150 }, "base": { "powerRequired": 75 } };
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

function production$$1(stateMachine, property) {
    var defaultValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    return (data.production[stateMachine.id] || {})[property] || defaultValue;
}

function limit(stateMachine, property) {
    var defaultValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

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
        input: function input(prevState) {
            return [{
                stateMachine: 'storage-matter',
                property: 'releasedMatter',
                as: 'unusedMatter',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            var releasedMatter = Math.min(prevState.releasedMatterPerTick, prevState.matter);
            return {
                matter: prevState.matter - releasedMatter + input.unusedMatter,
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
        input: function input(prevState) {
            return [{
                stateMachine: 'storage-antimatter',
                property: 'releasedAntimatter',
                as: 'unusedAntimatter',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            var releasedAntimatter = Math.min(prevState.releasedAntimatterPerTick, prevState.antimatter);
            return {
                antimatter: prevState.antimatter - releasedAntimatter + input.unusedAntimatter,
                releasedAntimatterPerTick: prevState.releasedAntimatterPerTick,
                releasedAntimatter: releasedAntimatter
            };
        }
    };
    var reactor = {
        id: 'reactor',
        output: ['energy', 'heat'],
        initialState: function initialState() {
            var minTemperature = production$$1(reactor, 'minTemperature', 25);

            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                energy: 0,
                heat: minTemperature
            };
        },
        input: function input(prevState) {
            var maxMatterInput = production$$1(reactor, 'maxMatterInput', 500);
            var maxAntimatterInput = production$$1(reactor, 'maxAntimatterInput', 500);

            var running = prevState.shutdownRemaining <= 0;

            var maxMatter = Math.min(Math.max(maxMatterInput - prevState.storedMatter, 0), maxMatterInput);
            var maxAntimatter = Math.min(Math.max(maxAntimatterInput - prevState.storedAntimatter, 0), maxAntimatterInput);

            return [{
                stateMachine: 'storage-matter',
                property: 'releasedMatter',
                as: 'matter',
                max: running ? maxMatter : 0
            }, {
                stateMachine: 'storage-antimatter',
                property: 'releasedAntimatter',
                as: 'antimatter',
                max: running ? maxAntimatter : 0
            }, {
                stateMachine: 'reactor',
                property: 'energy',
                priority: -100
            }, {
                stateMachine: 'reactor',
                property: 'heat',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            var requiredMatter = production$$1(reactor, 'maxMatterInput', 500);
            var requiredAntimatter = production$$1(reactor, 'maxAntimatterInput', 500);
            var energyGeneration = production$$1(reactor, 'maxEnergyGeneration', 100);
            var heatGeneration = production$$1(reactor, 'maxHeatGeneration', 100);

            var energyToHeat = production$$1(reactor, 'energyToHeatFactor', 1);

            var minTemperature = production$$1(reactor, 'minTemperature', 25);
            var minOperatingTemperature = production$$1(reactor, 'minOperatingTemperature', 100);
            var minOptimalTemperature = production$$1(reactor, 'minOptimalTemperature', 1000);
            var maxOptimalTemperature = production$$1(reactor, 'maxOptimalTemperature', 2000);
            var maxOperatingTemperature = production$$1(reactor, 'maxOperatingTemperature', 5000);

            var shutdownDuration = production$$1(reactor, 'shutdownDuration', 60);

            var reactorCooling = cooling$$1(reactor, 100);

            var state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                energy: 0,
                heat: Math.max(input.heat + input.energy * energyToHeat - reactorCooling, minTemperature)
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

                state.energy += energyGeneration * productivity * heatEfficiency;
                state.heat += heatGeneration * productivity;
            }

            return state;
        }
    };
    var energyDistributor = {
        id: 'energy-distributor',
        public: {
            converterWeight: {
                min: 0,
                max: 1
            },
            capacitorWeight: {
                min: 0,
                max: 1
            },
            coreWeight: {
                min: 0,
                max: 1
            }
        },
        output: ['converterEnergy', 'capacitorEnergy', 'coreEnergy'],
        initialState: function initialState() {
            return {
                unusedEnergy: 0,
                converterEnergy: 0,
                capacitorEnergy: 0,
                coreEnergy: 0,
                converterWeight: 1,
                capacitorWeight: 1,
                coreWeight: 1
            };
        },
        input: function input(prevState) {
            var maxInput = production$$1(energyDistributor, 'outputBuffer') * 3 - prevState.unusedEnergy;
            return [{
                stateMachine: reactor.id,
                property: 'energy',
                max: maxInput
            }, {
                stateMachine: energyDistributor.id,
                property: 'converterEnergy',
                priority: -100
            }, {
                stateMachine: energyDistributor.id,
                property: 'capacitorEnergy',
                priority: -100
            }, {
                stateMachine: energyDistributor.id,
                property: 'coreEnergy',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            var outputBuffer = production$$1(energyDistributor, 'outputBuffer');

            var converterBuffer = input.converterEnergy;
            var capacitorBuffer = input.capacitorEnergy;
            var coreBuffer = input.coreEnergy;

            var energy = prevState.unusedEnergy + input.energy;

            var iterations = 0;
            while (energy > 0 && iterations < 10) {
                iterations++;

                var converterBufferFull = converterBuffer >= outputBuffer;
                var capacitorBufferFull = capacitorBuffer >= outputBuffer;
                var coreBufferFull = coreBuffer >= outputBuffer;
                if (converterBufferFull && capacitorBufferFull && coreBufferFull) {
                    break;
                }

                var weightTotal = (converterBufferFull ? 0 : prevState.converterWeight) + (capacitorBufferFull ? 0 : prevState.capacitorWeight) + (coreBufferFull ? 0 : prevState.coreWeight);
                if (weightTotal <= 0) {
                    break;
                }

                if (!coreBufferFull && prevState.coreWeight > 0) {
                    var addedEnergy = Math.min(outputBuffer - coreBuffer, Math.max(energy * (prevState.coreWeight / weightTotal), 1), energy);
                    coreBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
                if (!converterBufferFull && prevState.converterWeight > 0) {
                    var _addedEnergy = Math.min(outputBuffer - converterBuffer, Math.max(energy * (prevState.converterWeight / weightTotal), 1), energy);
                    converterBuffer += _addedEnergy;
                    energy -= _addedEnergy;
                }
                if (!capacitorBufferFull && prevState.capacitorWeight > 0) {
                    var _addedEnergy2 = Math.min(outputBuffer - capacitorBuffer, Math.max(energy * (prevState.capacitorWeight / weightTotal), 1), energy);
                    capacitorBuffer += _addedEnergy2;
                    energy -= _addedEnergy2;
                }
            }

            return {
                unusedEnergy: energy,
                converterEnergy: converterBuffer,
                capacitorEnergy: capacitorBuffer,
                coreEnergy: coreBuffer,
                converterWeight: prevState.converterWeight,
                capacitorWeight: prevState.capacitorWeight,
                coreWeight: prevState.coreWeight
            };
        }
    };
    var energyConverter = {
        id: 'energy-converter',
        public: {
            energyConversion: {
                min: 0,
                max: production$$1({ id: 'energy-converter' }, 'maxConversion')
            }
        },
        output: ['power', 'energy'],
        initialState: function initialState() {
            return {
                energy: 0,
                energyConversion: 0,
                power: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: energyDistributor.id,
                property: 'converterEnergy',
                as: 'energy',
                max: prevState.energyConversion
            }];
        },
        update: function update(prevState, input) {
            var energyToPower = production$$1(energyConverter, 'energyToPowerFactor', 1);
            return {
                energy: input.energy,
                energyConversion: prevState.energyConversion,
                power: input.energy * energyToPower
            };
        }
    };
    var energyCapacitor = {
        id: 'energy-capacitor',
        output: ['energy'],
        initialState: function initialState() {
            return {
                capacity: limit(energyCapacitor, 'capacity'),
                energy: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: energyDistributor.id,
                property: 'capacitorEnergy',
                as: 'energy',
                max: prevState.capacity - prevState.energy
            }, {
                stateMachine: energyCapacitor.id,
                property: 'energy',
                as: 'storedEnergy',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            return {
                capacity: prevState.capacity,
                energy: input.storedEnergy + input.energy
            };
        }
    };
    var distributor = {
        id: 'distributor',
        output: ['power', 'heat'],
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
            var input = [{
                stateMachine: energyConverter.id,
                property: 'power',
                max: Infinity,
                priority: 100
            }, {
                stateMachine: distributor.id,
                property: 'power',
                as: 'unusedPower',
                priority: -100
            }, {
                stateMachine: distributor.id,
                property: 'heat',
                priority: 100
            }];

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                // FIXME
                input[0].max = 0;
            }

            return input;
        },
        update: function update(prevState, input) {
            var minTemperature = production$$1(distributor, 'minTemperature', 30);
            var maxTemperature = production$$1(distributor, 'maxTemperature', 200);
            var generatedHeat = input.unusedPower * production$$1(distributor, 'powerToHeatFactor', 1);
            var shutdownDuration = production$$1(distributor, 'shutdownDuration', 60);

            var state = {
                cooling: prevState.cooling,
                power: input.power,
                heat: Math.max(input.heat + generatedHeat - prevState.cooling, minTemperature),
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
            return [{
                stateMachine: distributor.id,
                property: 'power',
                max: prevState.powerRequired
            }, {
                stateMachine: reactor.id,
                property: 'heat',
                max: prevState.effectiveCooling
            }];
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
                energyRequired: limit(core, 'energyRequired', 100),
                energyConsumed: 0,
                energyFromDistributor: 0,
                energyFromCapacitor: 0,
                energyMissing: 0,
                energySatisfaction: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: energyDistributor.id,
                property: 'coreEnergy',
                as: 'energy',
                max: prevState.energyRequired
            }, {
                stateMachine: energyCapacitor.id,
                property: 'energy',
                as: 'capacitorEnergy',
                max: Math.max(prevState.energyRequired - prevState.energyFromDistributor, 0)
            }];
        },
        update: function update(prevState, input) {
            // It's possible we drew too much energy in one tick, so discard any excess
            var energy = Math.min(input.energy + input.capacitorEnergy, prevState.energyRequired);
            return {
                energyRequired: prevState.energyRequired,
                energyConsumed: energy,
                energyFromDistributor: input.energy,
                energyFromCapacitor: input.capacitorEnergy,
                energyMissing: Math.max(prevState.energyRequired - energy, 0),
                energySatisfaction: energy / prevState.energyRequired
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
            return [{
                stateMachine: distributor.id,
                property: 'power',
                max: prevState.powerRequired
            }];
        },
        update: function update(prevState, input) {
            return {
                powerRequired: prevState.powerRequired,
                powerConsumed: input.power,
                powerSatisfaction: input.power / prevState.powerRequired
            };
        }
    };

    return {
        stateMachines: [storageMatter, storageAntimatter, reactor, energyDistributor, energyCapacitor, energyConverter, distributor, reactorCooling, core, base]
    };
};

function value(config, type, stateMachineId, propertyName) {
    if (!config) {
        throw new Error('Invalid config file');
    }
    if (!config[type]) {
        throw new Error('No section of type \'' + type + '\' in config');
    }
    if (!config[type][stateMachineId]) {
        throw new Error('No ' + type + ' entry for state machine ' + stateMachineId);
    }
    if (typeof config[type][stateMachineId][propertyName] === 'undefined') {
        throw new Error('Property ' + propertyName + ' is not defined for state machine ' + stateMachineId + ' in type ' + type);
    }

    return config[type][stateMachineId][propertyName];
}

function initialValue(config, stateMachineId, propertyName) {
    return value(config, 'initial', stateMachineId, propertyName);
}

function configValue(config, stateMachineId, propertyName) {
    return value(config, 'config', stateMachineId, propertyName);
}

var initial$2 = { "storage-matter": { "matter": 432000000 }, "storage-antimatter": { "antimatter": 432000000 }, "reactor": {}, "energy-distributor": { "converterWeight": 1, "capacitorWeight": 0.5, "coreWeight": 1 }, "energy-capacitor": { "energy": 1080000 }, "energy-converter": { "energyConversion": 100 }, "power-capacitor": { "power": 360000 }, "core": { "nanites": 36000 }, "pump-a": { "enabled": 1, "filterHealth": 172800, "filterMaxHealth": 259200 }, "pump-b": { "enabled": 1, "filterHealth": 259200, "filterMaxHealth": 345600 }, "pump-c": { "enabled": 1, "filterHealth": 345600, "filterMaxHealth": 345600 }, "water-tank": { "water": 30000 }, "water-treatment": { "drinkingWater": 700, "resourceCleaner": 345600, "resourceChlorine": 345600, "resourceMinerals": 345600 } };
var config$1 = { "storage-matter": { "maxReleasedMatter": 500 }, "storage-antimatter": { "maxReleasedAntimatter": 500 }, "reactor": { "maxMatterInput": 500, "maxAntimatterInput": 500, "minTemperature": 25, "minOperatingTemperature": 100, "minOptimalTemperature": 1000, "maxOptimalTemperature": 2000, "maxOperatingTemperature": 3000, "maxEnergyGeneration": 300, "maxHeatGeneration": 2, "energyToHeatFactor": 0.02, "minShutdownDuration": 600, "maxShutdownDuration": 1200, "cooling": 0.5 }, "energy-distributor": { "outputBuffer": 200 }, "energy-converter": { "maxConversion": 100, "energyToPowerFactor": 2 }, "energy-capacitor": { "capacity": 1080000 }, "power-distributor": { "minTemperature": 30, "maxTemperature": 200, "powerToHeatFactor": 0.01, "cooling": 0.19, "shutdownDuration": 10 }, "power-capacitor": { "capacity": 360000, "generatorThreshold": 0.25 }, "reactor-cooling": { "maxPowerConsumption": 10, "maxWaterConsumption": 3000, "maxCooling": 1.25 }, "core": { "minEnergyRequired": 120, "maxEnergyRequired": 180, "minEnergyChangeInterval": 7200, "maxEnergyChangeInterval": 14400, "nanitesConsumption": 1, "nanitesRegeneration": 3, "nanitesCapacity": 65500 }, "base": { "powerRequired": 150, "silentRunningPowerRequired": 70, "lockdownPowerRequired": 10, "drinkingWaterRequired": 1000 }, "pump-a": { "maxProduction": 3200 }, "pump-b": { "maxProduction": 1900 }, "pump-c": { "maxProduction": 1200 }, "water-tank": { "capacity": 35000 }, "water-treatment": { "maxWaterConsumption": 1500, "maxPowerConsumption": 10, "drinkingWaterCapacity": 1000 } };
var be13 = {
	initial: initial$2,
	config: config$1
};

var STORAGE_ANTIMATTER_ID = 'storage-antimatter';

function createStorageAntimatter(config) {
    var maxReleasedAntimatter = config.value(STORAGE_ANTIMATTER_ID, 'maxReleasedAntimatter');

    var maxEnergyGeneration = config.value(REACTOR_ID, 'maxEnergyGeneration');
    var maxAntimatterInput = config.value(REACTOR_ID, 'maxAntimatterInput');

    return {
        id: STORAGE_ANTIMATTER_ID,
        public: {
            releasedAntimatterPerTick: {
                min: 0,
                max: maxReleasedAntimatter
            }
        },
        output: ['releasedAntimatter'],
        initialState: function initialState() {
            return {
                antimatter: config.initial(STORAGE_ANTIMATTER_ID, 'antimatter'),
                releasedAntimatterPerTick: 0,
                releasedAntimatter: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: STORAGE_ANTIMATTER_ID,
                property: 'releasedAntimatter',
                as: 'unusedAntimatter',
                priority: -100
            }];
        },
        update: function update(prevState, input, globals) {
            var prevReleasedAntimatter = prevState.releasedAntimatterPerTick;
            if (globals.resetAntimatterInput > 0) {
                prevReleasedAntimatter = 0;
                globals.resetAntimatterInput = 0;
            }

            var release = prevReleasedAntimatter + maxAntimatterInput * (globals.camouflageEnergyRequired / maxEnergyGeneration);
            var releasedAntimatter = Math.min(release, prevState.antimatter);
            return {
                antimatter: prevState.antimatter - releasedAntimatter + input.unusedAntimatter,
                releasedAntimatterPerTick: prevReleasedAntimatter,
                releasedAntimatter: releasedAntimatter
            };
        }
    };
}

var REACTOR_ID = 'reactor';

function createReactor(config) {
    var minTemperature = config.value(REACTOR_ID, 'minTemperature');
    var minOperatingTemperature = config.value(REACTOR_ID, 'minOperatingTemperature');
    var minOptimalTemperature = config.value(REACTOR_ID, 'minOptimalTemperature');
    var maxOptimalTemperature = config.value(REACTOR_ID, 'maxOptimalTemperature');
    var maxOperatingTemperature = config.value(REACTOR_ID, 'maxOperatingTemperature');

    var maxMatterInput = config.value(REACTOR_ID, 'maxMatterInput');
    var maxAntimatterInput = config.value(REACTOR_ID, 'maxAntimatterInput');

    var energyGeneration = config.value(REACTOR_ID, 'maxEnergyGeneration');
    var heatGeneration = config.value(REACTOR_ID, 'maxHeatGeneration');

    var energyToHeat = config.value(REACTOR_ID, 'energyToHeatFactor');

    var minShutdownDuration = config.value(REACTOR_ID, 'minShutdownDuration');
    var maxShutdownDuration = config.value(REACTOR_ID, 'maxShutdownDuration');

    var reactorCooling = config.value(REACTOR_ID, 'cooling');

    return {
        id: REACTOR_ID,
        output: ['energy', 'heat'],
        initialState: function initialState() {
            return {
                storedMatter: 0,
                storedAntimatter: 0,
                shutdownRemaining: 0,
                energy: 0,
                energyWasted: 0,
                heat: minTemperature
            };
        },
        input: function input(prevState) {
            var running = prevState.shutdownRemaining <= 0;

            var maxMatter = Math.min(Math.max(maxMatterInput - prevState.storedMatter, 0), maxMatterInput);
            var maxAntimatter = Math.min(Math.max(maxAntimatterInput - prevState.storedAntimatter, 0), maxAntimatterInput);

            return [{
                stateMachine: STORAGE_MATTER_ID,
                property: 'releasedMatter',
                as: 'matter',
                max: running ? maxMatter : 0
            }, {
                stateMachine: STORAGE_ANTIMATTER_ID,
                property: 'releasedAntimatter',
                as: 'antimatter',
                max: running ? maxAntimatter : 0
            }, {
                stateMachine: REACTOR_ID,
                property: 'energy',
                priority: -1000
            }, {
                stateMachine: REACTOR_ID,
                property: 'heat',
                priority: -1000
            }];
        },
        update: function update(prevState, input, globals) {
            var state = {
                storedMatter: prevState.storedMatter + input.matter,
                storedAntimatter: prevState.storedAntimatter + input.antimatter,
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
                energy: 0,
                energyWasted: input.energy,
                heat: Math.max(input.heat + input.energy * energyToHeat, minTemperature)
            };

            // Force full shutdown duration as long as reactor heat is above the threshold
            if (state.heat > maxOperatingTemperature) {
                state.shutdownRemaining = Math.floor(randomInRange(minShutdownDuration, maxShutdownDuration));

                globals.resetMatterInput = 1;
                globals.resetAntimatterInput = 1;
            }

            var running = state.shutdownRemaining <= 0;
            if (running) {
                var requiredMatter = maxMatterInput;
                var requiredAntimatter = maxAntimatterInput;

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

                state.energy += energyGeneration * productivity * heatEfficiency;
                state.heat += heatGeneration * productivity;
                if (globals.disableReactorCooling <= 0) {
                    state.heat -= reactorCooling;
                }
            }

            globals.disableReactorCooling = +(state.heat < minOptimalTemperature);

            return state;
        }
    };
}

var STORAGE_MATTER_ID = 'storage-matter';

function createStorageMatter(config) {
    var maxReleasedMatter = config.value(STORAGE_MATTER_ID, 'maxReleasedMatter');

    var maxEnergyGeneration = config.value(REACTOR_ID, 'maxEnergyGeneration');
    var maxMatterInput = config.value(REACTOR_ID, 'maxMatterInput');

    return {
        id: STORAGE_MATTER_ID,
        public: {
            releasedMatterPerTick: {
                min: 0,
                max: maxReleasedMatter
            }
        },
        output: ['releasedMatter'],
        initialState: function initialState() {
            return {
                matter: config.initial(STORAGE_MATTER_ID, 'matter'),
                releasedMatterPerTick: 0,
                releasedMatter: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: STORAGE_MATTER_ID,
                property: 'releasedMatter',
                as: 'unusedMatter',
                priority: -100
            }];
        },
        update: function update(prevState, input, globals) {
            var prevReleasedMatter = prevState.releasedMatterPerTick;
            if (globals.resetMatterInput > 0) {
                prevReleasedMatter = 0;
                globals.resetMatterInput = 0;
            }

            var release = prevReleasedMatter + maxMatterInput * (globals.camouflageEnergyRequired / maxEnergyGeneration);
            var releasedMatter = Math.min(release, prevState.matter);
            return {
                matter: prevState.matter - releasedMatter + input.unusedMatter,
                releasedMatterPerTick: prevReleasedMatter,
                releasedMatter: releasedMatter
            };
        }
    };
}

var ENERGY_CONVERTER_ID = 'energy-converter';

function createEnergyConverter(config) {
    var energyToPower = config.value(ENERGY_CONVERTER_ID, 'energyToPowerFactor');
    var maxConversion = config.value(ENERGY_CONVERTER_ID, 'maxConversion');
    var initialEnergyConversion = config.initial(ENERGY_CONVERTER_ID, 'energyConversion');

    return {
        id: ENERGY_CONVERTER_ID,
        public: {
            energyConversion: {
                min: 0,
                max: maxConversion
            }
        },
        output: ['power', 'energy'],
        initialState: function initialState() {
            return {
                energy: 0,
                energyConversion: initialEnergyConversion,
                power: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: REACTOR_ID,
                property: 'energy',
                max: prevState.energyConversion,
                priority: 0
            }];
        },
        update: function update(prevState, input) {
            return {
                energy: input.energy,
                energyConversion: prevState.energyConversion,
                power: input.energy * energyToPower
            };
        }
    };
}

var ENERGY_CAPACITOR_ID = 'energy-capacitor';

function createEnergyCapacitor(config) {
    var capacity = config.value(ENERGY_CAPACITOR_ID, 'capacity');
    var initialEnergy = config.initial(ENERGY_CAPACITOR_ID, 'energy');

    return {
        id: ENERGY_CAPACITOR_ID,
        output: ['energy'],
        initialState: function initialState() {
            return {
                capacity: capacity,
                energy: initialEnergy
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: REACTOR_ID,
                property: 'energy',
                max: prevState.capacity - prevState.energy,
                priority: -100
            }, {
                stateMachine: ENERGY_CAPACITOR_ID,
                property: 'energy',
                as: 'storedEnergy',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            return {
                capacity: prevState.capacity,
                energy: input.storedEnergy + input.energy
            };
        }
    };
}

var POWER_DISTRIBUTOR_ID = 'power-distributor';

function createPowerDistributor(config) {
    var minTemperature = config.value(POWER_DISTRIBUTOR_ID, 'minTemperature');
    var maxTemperature = config.value(POWER_DISTRIBUTOR_ID, 'maxTemperature');
    var cooling = config.value(POWER_DISTRIBUTOR_ID, 'cooling');
    var powerToHeatFactor = config.value(POWER_DISTRIBUTOR_ID, 'powerToHeatFactor');

    var shutdownDuration = config.value(POWER_DISTRIBUTOR_ID, 'shutdownDuration');

    return {
        id: POWER_DISTRIBUTOR_ID,
        output: ['power', 'heat'],
        initialState: function initialState() {
            return {
                power: 0,
                wastedPower: 0,
                heat: minTemperature,
                shutdownRemaining: 0
            };
        },
        input: function input(prevState) {
            var input = [{
                stateMachine: ENERGY_CONVERTER_ID,
                property: 'power',
                max: Infinity,
                priority: 100
            }, {
                stateMachine: POWER_DISTRIBUTOR_ID,
                property: 'power',
                as: 'unusedPower',
                priority: -100
            }, {
                stateMachine: POWER_DISTRIBUTOR_ID,
                property: 'heat',
                priority: 100
            }];

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                // FIXME
                input[0].max = 0;
            }

            return input;
        },
        update: function update(prevState, input) {
            var generatedHeat = input.unusedPower * powerToHeatFactor;

            var state = {
                power: input.power,
                wastedPower: input.unusedPower,
                heat: Math.max(input.heat + generatedHeat - cooling, minTemperature),
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0)
            };

            if (state.heat > maxTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            return state;
        }
    };
}

var POWER_CAPACITOR_ID = 'power-capacitor';

function createPowerCapacitor(config) {
    var capacity = config.value(POWER_CAPACITOR_ID, 'capacity');
    var generatorThreshold = config.value(POWER_CAPACITOR_ID, 'generatorThreshold');
    var initialPower = config.initial(POWER_CAPACITOR_ID, 'power');

    return {
        id: POWER_CAPACITOR_ID,
        output: ['power'],
        initialState: function initialState() {
            return {
                capacity: capacity,
                power: initialPower,
                difference: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: POWER_DISTRIBUTOR_ID,
                property: 'power',
                max: prevState.capacity - prevState.power
            }, {
                stateMachine: POWER_CAPACITOR_ID,
                property: 'power',
                as: 'storedPower',
                priority: -100
            }];
        },
        update: function update(prevState, input, globals) {
            var generatorThresholdValue = prevState.capacity * generatorThreshold;
            var power = input.storedPower + input.power;
            globals.generatorRunning = +(power <= generatorThresholdValue);
            return {
                capacity: prevState.capacity,
                power: Math.max(power, generatorThresholdValue),
                difference: power - prevState.power
            };
        }
    };
}

var PUMP_IDS = ['pump-a', 'pump-b', 'pump-c'];

var HOUR_TO_TICK$1 = 3600;

function createPump(config, id) {
    var maxProduction = config.value(id, 'maxProduction') / HOUR_TO_TICK$1;
    var initiallyEnabled = config.initial(id, 'enabled');
    var filterHealth = config.initial(id, 'filterHealth');
    var filterMaxHealth = config.initial(id, 'filterMaxHealth');

    return {
        id: id,
        public: {
            enabled: {
                min: 0,
                max: 1
            }
        },
        output: ['water'],
        initialState: function initialState() {
            return {
                maxProduction: maxProduction,
                enabled: initiallyEnabled,
                filterHealth: filterHealth,
                filterMaxHealth: filterMaxHealth,
                water: 0
            };
        },
        update: function update(prevState, input) {
            var efficiency = prevState.enabled ? clamp(prevState.filterHealth / prevState.filterMaxHealth, 0, 1) : 0;

            return {
                maxProduction: prevState.maxProduction,
                enabled: prevState.enabled ? 1 : 0,
                filterHealth: prevState.enabled ? Math.max(prevState.filterHealth - 1, 0) : prevState.filterHealth,
                filterMaxHealth: prevState.filterMaxHealth,
                water: prevState.maxProduction * efficiency
            };
        }
    };
}

function createPumps(config) {
    return PUMP_IDS.map(function (id) {
        return createPump(config, id);
    });
}

var WATER_TANK_ID = 'water-tank';

function createWaterTank(config) {
    var capacity = config.value(WATER_TANK_ID, 'capacity');
    var initialWater = config.initial(WATER_TANK_ID, 'water');

    return {
        id: WATER_TANK_ID,
        output: ['water'],
        initialState: function initialState() {
            return {
                capacity: capacity,
                water: initialWater
            };
        },
        input: function input(prevState) {
            return [].concat(toConsumableArray(PUMP_IDS.map(function (id) {
                return {
                    stateMachine: id,
                    property: 'water',
                    as: 'water-' + id
                };
            })), [{
                // Pipe unused water back into the tank
                stateMachine: WATER_TANK_ID,
                property: 'water',
                as: 'unusedWater',
                priority: -100
            }]);
        },
        update: function update(prevState, input) {
            var water = input.unusedWater;
            PUMP_IDS.forEach(function (id) {
                return water += input['water-' + id];
            });

            return {
                capacity: prevState.capacity,
                water: clamp(water, 0, prevState.capacity)
            };
        }
    };
}

var COOLING_ID = 'reactor-cooling';

var HOUR_TO_TICK = 3600;

function createCooling(config) {
    var maxPowerConsumption = config.value(COOLING_ID, 'maxPowerConsumption');
    var maxWaterConsumption = config.value(COOLING_ID, 'maxWaterConsumption') / HOUR_TO_TICK;
    var maxCooling = config.value(COOLING_ID, 'maxCooling');

    return {
        id: COOLING_ID,
        public: {
            cooling: {
                min: 0,
                max: maxCooling
            }
        },
        initialState: function initialState() {
            return {
                cooling: 0,
                effectiveCooling: 0,
                powerRequired: 0,
                waterRequired: 0,
                powerSatisfaction: 1,
                waterSatisfaction: 1
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: POWER_CAPACITOR_ID,
                property: 'power',
                max: prevState.powerRequired
            }, {
                stateMachine: WATER_TANK_ID,
                property: 'water',
                max: prevState.waterRequired,
                priority: 100
            }, {
                stateMachine: REACTOR_ID,
                property: 'heat',
                max: prevState.effectiveCooling
            }];
        },
        update: function update(prevState, input, globals) {
            var cooling = clamp(prevState.cooling / maxCooling, 0, 1);
            var active = cooling > 0 && globals.disableReactorCooling <= 0;

            var powerRequired = maxPowerConsumption * cooling;
            var powerSatisfaction = active ? clamp(input.power / powerRequired, 0, 1) : 1;

            // Water consumption depends on pump having enough power
            var waterRequired = maxWaterConsumption * Math.min(cooling, powerSatisfaction);
            var waterSatisfaction = active ? clamp(input.water / (maxWaterConsumption * cooling), 0, 1) : 1;

            var effectiveCooling = active ? prevState.cooling * Math.min(powerSatisfaction, waterSatisfaction) : 0;

            return {
                cooling: prevState.cooling,
                effectiveCooling: effectiveCooling,
                powerRequired: powerRequired,
                waterRequired: waterRequired,
                powerSatisfaction: powerSatisfaction,
                waterSatisfaction: waterSatisfaction
            };
        }
    };
}

var CORE_ID = 'core';

function createCore(config) {
    var minEnergyRequired = config.value(CORE_ID, 'minEnergyRequired');
    var maxEnergyRequired = config.value(CORE_ID, 'maxEnergyRequired');
    var minEnergyChangeInterval = config.value(CORE_ID, 'minEnergyChangeInterval');
    var maxEnergyChangeInterval = config.value(CORE_ID, 'maxEnergyChangeInterval');
    var nanitesConsumption = config.value(CORE_ID, 'nanitesConsumption');
    var nanitesRegeneration = config.value(CORE_ID, 'nanitesRegeneration');
    var nanitesCapacity = config.value(CORE_ID, 'nanitesCapacity');

    var initialNanites = config.initial(CORE_ID, 'nanites');

    function updateEnergyRequired() {
        return randomInRange(minEnergyRequired, maxEnergyRequired);
    }

    function updateNextEnergyChange() {
        return Math.floor(randomInRange(minEnergyChangeInterval, maxEnergyChangeInterval));
    }

    return {
        id: CORE_ID,
        initialState: function initialState() {
            return {
                energyRequired: 0,
                nextEnergyChange: 0,
                nanites: initialNanites,
                nanitesCapacity: nanitesCapacity,
                energyConsumed: 0,
                energyFromReactor: 0,
                energyFromCapacitor: 0,
                energyMissing: 0,
                energySatisfaction: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: REACTOR_ID,
                property: 'energy',
                max: prevState.energyRequired,
                priority: 100
            }, {
                stateMachine: ENERGY_CAPACITOR_ID,
                property: 'energy',
                as: 'capacitorEnergy',
                max: Math.max(prevState.energyRequired - prevState.energyFromReactor, 0)
            }];
        },
        update: function update(prevState, input, globals) {
            var disabled = !globals.camouflage || prevState.nanites <= 0;

            var energyRequired = prevState.energyRequired;
            var nextEnergyChange = Math.max(prevState.nextEnergyChange - 1, 0);

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
            var energy = Math.min(input.energy + input.capacitorEnergy, energyRequired);

            return {
                energyRequired: energyRequired,
                nextEnergyChange: nextEnergyChange,
                nanites: clamp(prevState.nanites + (globals.camouflage ? nanitesRegeneration : -nanitesConsumption), 0, prevState.nanitesCapacity),
                nanitesCapacity: prevState.nanitesCapacity,
                energyConsumed: energy,
                energyFromReactor: input.energy,
                energyFromCapacitor: input.capacitorEnergy,
                energyMissing: Math.max(prevState.energyRequired - energy, 0),
                energySatisfaction: disabled ? 1 : energy / prevState.energyRequired
            };
        }
    };
}

var WATER_TREATMENT_ID = 'water-treatment';

var HOUR_TO_TICK$3 = 3600;

function createWaterTreatment(config) {
    var maxWaterConsumption = config.value(WATER_TREATMENT_ID, 'maxWaterConsumption') / HOUR_TO_TICK$3;
    var maxPowerConsumption = config.value(WATER_TREATMENT_ID, 'maxPowerConsumption');

    var drinkingWaterCapacity = config.value(WATER_TREATMENT_ID, 'drinkingWaterCapacity');

    var initialDrinkingWater = config.initial(WATER_TREATMENT_ID, 'drinkingWater');
    var initialResourceCleaner = config.initial(WATER_TREATMENT_ID, 'resourceCleaner');
    var initialResourceChlorine = config.initial(WATER_TREATMENT_ID, 'resourceChlorine');
    var initialResourceMinerals = config.initial(WATER_TREATMENT_ID, 'resourceMinerals');

    return {
        id: WATER_TREATMENT_ID,
        output: ['drinkingWater'],
        initialState: function initialState() {
            return {
                resourceCleaner: initialResourceCleaner,
                resourceChlorine: initialResourceChlorine,
                resourceMinerals: initialResourceMinerals,
                powerSatisfaction: 0,
                requiredWater: 0,
                requiredPower: maxPowerConsumption,
                water: 0,
                drinkingWater: initialDrinkingWater
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: WATER_TANK_ID,
                property: 'water',
                max: prevState.requiredWater,
                priority: 50
            }, {
                stateMachine: POWER_CAPACITOR_ID,
                property: 'power',
                max: prevState.requiredPower
            }, {
                stateMachine: WATER_TREATMENT_ID,
                property: 'drinkingWater',
                as: 'unusedDrinkingWater',
                priority: -100
            }];
        },
        update: function update(prevState, input) {
            var totalWater = prevState.water + input.water;
            var powerRequired = totalWater / maxWaterConsumption * maxPowerConsumption;
            var powerSatisfaction = powerRequired ? input.power / powerRequired : 0;
            var treatedWater = totalWater * powerSatisfaction;

            var efficiency = treatedWater / maxWaterConsumption;

            var water = Math.max(totalWater - treatedWater, 0);

            var requiredWater = Math.max(maxWaterConsumption - water, 0);
            var requiredPower = clamp((water + requiredWater) / maxWaterConsumption, 0, 1) * maxPowerConsumption;

            return {
                resourceCleaner: Math.max(prevState.resourceCleaner - efficiency, 0),
                resourceChlorine: Math.max(prevState.resourceChlorine - efficiency, 0),
                resourceMinerals: Math.max(prevState.resourceMinerals - efficiency, 0),
                powerSatisfaction: requiredPower > 0 ? powerSatisfaction : 1,
                requiredWater: requiredWater,
                requiredPower: requiredPower,
                water: water,
                drinkingWater: clamp(input.unusedDrinkingWater + treatedWater, 0, drinkingWaterCapacity)
            };
        }
    };
}

var BASE_ID = 'base';

var HOUR_TO_TICK$2 = 3600;

function createCore$1(config) {
    var powerRequired = config.value(BASE_ID, 'powerRequired');
    var powerRequiredSilentRunning = config.value(BASE_ID, 'silentRunningPowerRequired');
    var powerRequiredLockdown = config.value(BASE_ID, 'lockdownPowerRequired');
    var drinkingWaterRequired = config.value(BASE_ID, 'drinkingWaterRequired') / HOUR_TO_TICK$2;

    return {
        id: BASE_ID,
        initialState: function initialState() {
            return {
                powerRequired: powerRequired,
                powerSatisfaction: 0,
                drinkingWaterRequired: drinkingWaterRequired,
                drinkingWaterSatisfaction: 0
            };
        },
        input: function input(prevState) {
            return [{
                stateMachine: POWER_CAPACITOR_ID,
                property: 'power',
                max: prevState.powerRequired
            }, {
                stateMachine: WATER_TREATMENT_ID,
                property: 'drinkingWater',
                max: prevState.drinkingWaterRequired
            }];
        },
        update: function update(prevState, input, globals) {
            var requiredPower = globals.lockdown ? powerRequiredLockdown : globals.silentRunning ? powerRequiredSilentRunning : powerRequired;
            return {
                powerRequired: requiredPower,
                powerSatisfaction: input.power / requiredPower,
                drinkingWaterRequired: prevState.drinkingWaterRequired,
                drinkingWaterSatisfaction: input.drinkingWater / prevState.drinkingWaterRequired
            };
        }
    };
}

var config$$1 = {
    initial: function initial$$1(stateMachine, property) {
        return initialValue(be13, stateMachine, property);
    },
    value: function value(stateMachine, property) {
        return configValue(be13, stateMachine, property);
    }
};


function createProgramBe13() {
    return {
        globals: {
            effects: 1, // Sound/light, not really used in the simulation itself
            lockdown: 0,
            silentRunning: 0,
            camouflage: 1,
            camouflageEnergyRequired: 0,
            disableReactorCooling: 0,
            generatorRunning: 0,
            resetMatterInput: 0,
            resetAntimatterInput: 0
        },
        stateMachines: [createStorageMatter(config$$1), createStorageAntimatter(config$$1), createReactor(config$$1), createEnergyCapacitor(config$$1), createEnergyConverter(config$$1), createPowerDistributor(config$$1), createPowerCapacitor(config$$1), createCooling(config$$1), createCore(config$$1), createCore$1(config$$1)].concat(toConsumableArray(createPumps(config$$1)), [createWaterTank(config$$1), createWaterTreatment(config$$1)])
    };
}

var index = {
    createInitialState: createInitialState,
    update: update,
    Program: {
        Prototype: prototype(),
        BE13: createProgramBe13()
    }
};

return index;

})));
