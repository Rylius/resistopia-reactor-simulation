export function clean(program) {
    program.stateMachines.forEach(stateMachine => {
        if (!stateMachine.public) {
            stateMachine.public = {};
        }

        if (!stateMachine.output) {
            stateMachine.output = [];
        }
    });
}

export function validate(program) {
    // TODO
}
