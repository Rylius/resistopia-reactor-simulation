// @flow

export type Config = { [type: string]: { [stateMachine: string]: number } }

function value(config: Config, type: string, stateMachineId: string, propertyName: string): number {
    if (!config) {
        throw new Error('Invalid config file');
    }
    if (!config[type]) {
        throw new Error(`No section of type '${type}' in config`);
    }
    if (!config[type][stateMachineId]) {
        throw new Error(`No ${type} entry for state machine ${stateMachineId}`);
    }
    if (typeof config[type][stateMachineId][propertyName] === 'undefined') {
        throw new Error(`Property ${propertyName} is not defined for state machine ${stateMachineId} in type ${type}`);
    }

    return config[type][stateMachineId][propertyName];
}

export function initialValue(config: Config, stateMachineId: string, propertyName: string): number {
    return value(config, 'initial', stateMachineId, propertyName);
}

export function configValue(config: Config, stateMachineId: string, propertyName: string): number {
    return value(config, 'config', stateMachineId, propertyName);
}
