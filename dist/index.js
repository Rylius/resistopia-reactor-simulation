(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', '../src/state', '../src/update'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('../src/state'), require('../src/update'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.state, global.update);
        global.index = mod.exports;
    }
})(this, function (exports, _state, _update) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _update2 = _interopRequireDefault(_update);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    exports.default = {
        createInitialState: _state.createInitialState,
        update: _update2.default
    };
});
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.state = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.createInitialState = createInitialState;
    exports.getInput = getInput;
    function createInitialState(program) {
        var state = {
            tick: 0,
            seconds: 0,
            time: Date.now(),
            stateMachines: {},
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
});
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', './state'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('./state'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.state);
        global.update = mod.exports;
    }
})(this, function (exports, _state) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = update;


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

        console.log(parentId + '.' + targetProperty + ': ' + value + ' from ' + sourceId + '.' + source.property + ' (' + sourceState[source.property] + ')');

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
            state.inputs[stateMachine.id] = (0, _state.getInput)(stateMachine, prevState.stateMachines[stateMachine.id]);
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
    };
});

//# sourceMappingURL=index.js.map