// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {ENERGY_CONVERTER_ID} from '../energy/converter';

export const POWER_DISTRIBUTOR_ID = 'power-distributor';

export default function createPowerDistributor(config: Config): StateMachine {
    const minTemperature = config.value(POWER_DISTRIBUTOR_ID, 'minTemperature');
    const maxTemperature = config.value(POWER_DISTRIBUTOR_ID, 'maxTemperature');
    const cooling = config.value(POWER_DISTRIBUTOR_ID, 'cooling');
    const powerToHeatFactor = config.value(POWER_DISTRIBUTOR_ID, 'powerToHeatFactor');

    const shutdownDuration = config.value(POWER_DISTRIBUTOR_ID, 'shutdownDuration');

    return {
        id: POWER_DISTRIBUTOR_ID,
        output: ['power', 'heat'],
        initialState() {
            return {
                power: 0,
                wastedPower: 0,
                heat: minTemperature,
                shutdownRemaining: 0,
            };
        },
        input(prevState) {
            const input = [
                {
                    stateMachine: ENERGY_CONVERTER_ID,
                    property: 'power',
                    max: Infinity,
                    priority: 100,
                },
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'power',
                    as: 'unusedPower',
                    priority: -100,
                },
                {
                    stateMachine: POWER_DISTRIBUTOR_ID,
                    property: 'heat',
                    priority: 100,
                },
            ];

            // Stop consuming power if we're overheated
            if (prevState.shutdownRemaining > 0) {
                // FIXME
                input[0].max = 0;
            }

            return input;
        },
        update(prevState, input) {
            const generatedHeat = input.unusedPower * powerToHeatFactor;

            const state = {
                power: input.power,
                wastedPower: input.unusedPower,
                heat: Math.max((input.heat + generatedHeat) - prevState.cooling, minTemperature),
                shutdownRemaining: Math.max(prevState.shutdownRemaining - 1, 0),
            };

            if (state.heat > maxTemperature) {
                state.shutdownRemaining = shutdownDuration;
            }

            return state;
        },
    };
}
