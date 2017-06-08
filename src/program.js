// @flow

import type {StateMachineState, StateMachineInput, StateMachineInputRequest} from './state';

export type Program = {
    stateMachines: Array<StateMachine>,
}

export type StateMachine = {
    id: string,
    public?: { [key: string]: PublicProperty },
    output?: Array<string>,
    initialState: () => StateMachineState,
    input?: (StateMachineState) => Array<StateMachineInputRequest>,
    update: (StateMachineState, StateMachineInput) => StateMachineState,
}

export type PublicProperty = {}
