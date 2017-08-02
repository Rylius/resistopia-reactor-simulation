// @flow

import type {StateMachineState, StateMachineInput, StateMachineInputRequest} from './state';

export type Program = {
    globals: Globals,
    stateMachines: Array<StateMachine>,
}

export type Globals = { [id: string]: number }

export type StateMachine = {
    id: string,
    public?: { [key: string]: PublicProperty },
    output?: Array<string>,
    initialState: () => StateMachineState,
    input?: (StateMachineState) => Array<StateMachineInputRequest>,
    update: (StateMachineState, StateMachineInput, Globals) => StateMachineState,
}

export type PublicProperty = {}
