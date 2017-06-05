export function createInitialState(program) {
    const state = {
        tick: 0,
        time: Date.now(),
        stateMachines: {},
        outputs: {},
        inputs: {},
    };

    program.stateMachines.forEach(stateMachine => {
        if (stateMachine.initialState) {
            state.stateMachines[stateMachine.id] = stateMachine.initialState()
        } else {
            state.stateMachines[stateMachine.id] = {};
        }

        state.inputs[stateMachine.id] = getInput(stateMachine, state, 0);
    });

    return state;
}

export function getInput(stateMachine, prevState) {
    if (!stateMachine.input) {
        return {};
    }

    return stateMachine.input(prevState);
}
