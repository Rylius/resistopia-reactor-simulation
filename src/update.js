import {getInput} from './state';

export default function update(program, prevState, seconds) {
    const state = {
        tick: prevState.tick + 1,
        time: Date.now(),
        stateMachines: {},
        inputs: {},
    };

    program.stateMachines.forEach(stateMachine => {
        state.stateMachines[stateMachine.id] = {};

        const inputSources = prevState.inputs[stateMachine.id];
        const input = {};
        Object.keys(inputSources).forEach(sourceId => {
            const source = inputSources[sourceId];
            const sourceState = prevState.stateMachines[sourceId];
            if (!sourceState) {
                throw new Error(`No source state for ${sourceId} in ${stateMachine.id} input`);
            }

            const targetProperty = source.as || source.property;
            const max = source.max ? source.max : sourceState[source.property];
            const value = Math.min(sourceState[source.property], max);

            // console.log(`${stateMachine.id}.${targetProperty}: ${value} from ${sourceId}.${source.property} (${sourceState[source.property]})`);

            sourceState[source.property] -= value;
            input[targetProperty] = value;
        });

        if (!stateMachine.update) {
            return;
        }

        state.stateMachines[stateMachine.id] = stateMachine.update(prevState.stateMachines[stateMachine.id], input, seconds);
    });

    program.stateMachines.forEach(stateMachine => {
        state.inputs[stateMachine.id] = getInput(stateMachine, prevState.stateMachines[stateMachine.id], seconds);
    });

    return state;
};
