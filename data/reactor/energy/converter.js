// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {ENERGY_DISTRIBUTOR_ID} from './distributor';

export const ENERGY_CONVERTER_ID = 'energy-converter';

export default function createEnergyConverter(config: Config): StateMachine {
    const energyToPower = config.value(ENERGY_CONVERTER_ID, 'energyToPowerFactor');
    const maxConversion = config.value(ENERGY_CONVERTER_ID, 'maxConversion');

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
                energyConversion: 0,
                power: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'converterEnergy',
                    as: 'energy',
                    max: prevState.energyConversion,
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
