// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {REACTOR_ID} from '../reactor';

export const ENERGY_CONVERTER_ID = 'energy-converter';

export default function createEnergyConverter(config: Config): StateMachine {
    const energyToPower = config.value(ENERGY_CONVERTER_ID, 'energyToPowerFactor');
    const maxConversion = config.value(ENERGY_CONVERTER_ID, 'maxConversion');
    const initialEnergyConversion = config.initial(ENERGY_CONVERTER_ID, 'energyConversion');

    return {
        id: ENERGY_CONVERTER_ID,
        public: {
            energyConversion: {
                min: 0,
                max: maxConversion,
            },
        },
        output: ['power', 'energy'],
        initialState() {
            return {
                energy: 0,
                energyConversion: initialEnergyConversion,
                power: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    max: prevState.energyConversion,
                    priority: 0,
                },
            ];
        },
        update(prevState, input) {
            return {
                energy: input.energy,
                energyConversion: prevState.energyConversion,
                power: input.energy * energyToPower,
            };
        },
    };
}
