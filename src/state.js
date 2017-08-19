// @flow

import type {Globals, Program, StateMachine} from './program';

export type State = {|
    tick: number,
    time: number,
    globals: Globals,
    stateMachines: { [id: string]: StateMachineState },
|}

// FIXME Should be number, but Flow keeps complaining for whatever reason
export type StateMachineState = { [property: string]: any }
export type StateMachineOutput = StateMachineState
export type StateMachineInput = StateMachineState

export type StateMachineInputRequest = {
    stateMachine: string,
    property: string,
    as?: string,
    max?: number,
    priority?: number,
    _target?: StateMachine,
}

export function createInitialState(program: Program): State {
    const state: State = {
        tick: 0,
        time: Date.now(),
        globals: program.globals,
        stateMachines: {},
    };

    program.stateMachines.forEach((stateMachine: StateMachine) => {
        if (stateMachine.initialState) {
            state.stateMachines[stateMachine.id] = stateMachine.initialState();
        } else {
            state.stateMachines[stateMachine.id] = {};
        }
    });

    return state;
}

export function inputRequestsFor(stateMachine: StateMachine, prevState: StateMachineState): Array<StateMachineInputRequest> {
    if (!stateMachine.input) {
        return [];
    }

    return stateMachine.input(prevState);
}
