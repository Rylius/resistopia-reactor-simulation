// @flow

export type Program = {
    stateMachines: Array<StateMachine>;
}

export type StateMachine = {
    id: string;

    public?: { [key: string]: PublicProperty };
    output?: Array<string>;
}

export type PublicProperty = {}

export function clean(program: Program): void {
    program.stateMachines.forEach(stateMachine => {
        if (!stateMachine.public) {
            stateMachine.public = {};
        }

        if (!stateMachine.output) {
            stateMachine.output = [];
        }
    });
}

export function validate(program: Program): void {
    // TODO
}
