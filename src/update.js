// @flow

import type {Program, StateMachine} from './program';
import type {State, StateMachineState, StateMachineOutput, StateMachineInput, StateMachineInputRequest} from './state';

import {inputRequestsFor} from './state';

function failInputRequest(stateMachine: StateMachine, request: StateMachineInputRequest, message: string): Error {
    return new Error(`Failed to process input request of "${stateMachine.id}" for "${request.stateMachine}.${request.property}": ${message}`);
}

function inputRequestComparator(a: StateMachineInputRequest, b: StateMachineInputRequest): number {
    const priorityA: number = (typeof a.priority === 'undefined') ? 0 : a.priority;
    const priorityB: number = (typeof b.priority === 'undefined') ? 0 : b.priority;

    if (priorityA === priorityB) {
        return 0;
    }
    return priorityA < priorityB ? 1 : -1;
}

function processInputRequests(program: Program, outputs: { [id: string]: StateMachineState }, inputRequests: Array<StateMachineInputRequest>, inputs: { [id: string]: StateMachineInput }): void {
    inputRequests.forEach(request => {
        const stateMachine = request._target;
        if (!stateMachine) {
            throw new Error('Invalid input request: No target set');
        }

        const sourceStateMachine = program.stateMachines.find(machine => machine.id === request.stateMachine);
        if (!sourceStateMachine) {
            throw failInputRequest(stateMachine, request, `Source state machine does not exist`);
        }
        if (!sourceStateMachine.output || !sourceStateMachine.output.includes(request.property)) {
            throw failInputRequest(stateMachine, request, `Requested property is not declared as an output property`);
        }

        const output = outputs[request.stateMachine];
        if (!output) {
            throw failInputRequest(stateMachine, request, `Source state machine did not produce any output`);
        }
        const outputValue = output[request.property];
        if (typeof outputValue === 'undefined') {
            throw failInputRequest(stateMachine, request, `Source state machine did not produce output for requested property`);
        }

        const max = (typeof request.max === 'number') ? request.max : outputValue;
        const value = Math.min(outputValue, max);

        output[request.property] -= value;

        const targetProperty = request.as || request.property;
        inputs[stateMachine.id][targetProperty] = value;

        // console.log(`${stateMachine.id} consumed ${value} from ${sourceStateMachine.id}.${request.property} as ${targetProperty}`);
    });
}

export default function update(program: Program, prevState: State) {
    const state = {
        tick: prevState.tick + 1,
        time: Date.now(),
        stateMachines: {},
        outputs: {},
        inputs: {},
    };

    const outputs: { [id: string]: StateMachineOutput } = {};
    const inputs: { [id: string]: StateMachineInput } = {};
    const allInputRequests: Array<StateMachineInputRequest> = [];
    program.stateMachines.forEach(stateMachine => {
        // Gather all input requests this state machine created
        const requests = inputRequestsFor(stateMachine, prevState.stateMachines[stateMachine.id]);
        requests.forEach(request => request._target = stateMachine);
        allInputRequests.push(...requests);

        inputs[stateMachine.id] = {};

        if (!stateMachine.output) {
            return;
        }

        // Copy output properties from previous tick
        outputs[stateMachine.id] = {};
        // $FlowFixMe
        stateMachine.output.forEach(property => {
            outputs[stateMachine.id][property] = prevState.stateMachines[stateMachine.id][property];
        });
    });

    // Process input requests
    program.stateMachines.forEach(stateMachine => {
        const requests = allInputRequests
            .filter(request => request.stateMachine === stateMachine.id) // Group by source state machine
            .sort(inputRequestComparator); // Sort by priority

        processInputRequests(program, outputs, requests, inputs);
    });

    program.stateMachines.forEach(stateMachine => {
        state.stateMachines[stateMachine.id] = {};

        if (!stateMachine.update) {
            return;
        }

        state.stateMachines[stateMachine.id] = stateMachine.update(prevState.stateMachines[stateMachine.id], inputs[stateMachine.id]);
    });

    // console.log(`tick ${state.tick}`);
    // console.log(state.inputs);
    // console.log('-----------------');
    // console.log(state.stateMachines);
    // console.log('=================');

    return state;
};
