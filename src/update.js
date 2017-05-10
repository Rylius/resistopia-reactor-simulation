import {getInput} from './state';

function parseInput(prevState, state, stateMachine) {
    const input = {};

    const inputSources = state.inputs[stateMachine.id];
    Object.keys(inputSources).forEach(sourceId => {
        const sourceState = state.stateMachines[sourceId] || prevState.stateMachines[sourceId];
        parseInputSource(sourceState, inputSources[sourceId], input, stateMachine.id, sourceId);
    });

    return input;
}

function parseInputSource(sourceState, source, input, parentId, sourceId) {
    const targetProperty = source.as || source.property;
    const max = (typeof source.max === 'number') ? source.max : sourceState[source.property];
    const value = Math.min(sourceState[source.property], max);

    console.log(`${parentId}.${targetProperty}: ${value} from ${sourceId}.${source.property} (${sourceState[source.property]})`);

    if (!source.readOnly) {
        sourceState[source.property] -= value;
    }
    input[targetProperty] = value;
}

export default function update(program, prevState) {
    const state = {
        tick: prevState.tick + 1,
        time: Date.now(),
        stateMachines: {},
        inputs: {},
    };

    program.stateMachines.forEach(stateMachine => {
        state.inputs[stateMachine.id] = getInput(stateMachine, prevState.stateMachines[stateMachine.id]);
    });

    program.stateMachines.forEach(stateMachine => {
        state.stateMachines[stateMachine.id] = {};

        if (!stateMachine.update) {
            return;
        }

        const input = parseInput(prevState, state, stateMachine);

        state.stateMachines[stateMachine.id] = stateMachine.update(prevState.stateMachines[stateMachine.id], input);
    });

    // console.log(`tick ${state.tick}`);
    // console.log(state.inputs);
    // console.log('-----------------');
    // console.log(state.stateMachines);
    // console.log('=================');

    return state;
};
