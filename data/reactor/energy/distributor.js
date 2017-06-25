// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

import {REACTOR_ID} from '../reactor';

export const ENERGY_DISTRIBUTOR_ID = 'energy-distributor';

export default function createEnergyDistributor(config: Config): StateMachine {
    const outputBuffer = config.value(ENERGY_DISTRIBUTOR_ID, 'outputBuffer');

    const initialConverterWeight = config.initial(ENERGY_DISTRIBUTOR_ID, 'converterWeight');
    const initialCapacitorWeight = config.initial(ENERGY_DISTRIBUTOR_ID, 'capacitorWeight');
    const initialCoreWeight = config.initial(ENERGY_DISTRIBUTOR_ID, 'coreWeight');

    return {
        id: ENERGY_DISTRIBUTOR_ID,
        public: {
            converterWeight: {
                min: 0,
                max: 1,
            },
            capacitorWeight: {
                min: 0,
                max: 1,
            },
            coreWeight: {
                min: 0,
                max: 1,
            },
        },
        output: ['converterEnergy', 'capacitorEnergy', 'coreEnergy'],
        initialState() {
            return {
                unusedEnergy: 0,
                converterEnergy: 0,
                capacitorEnergy: 0,
                coreEnergy: 0,
                converterWeight: initialConverterWeight,
                capacitorWeight: initialCapacitorWeight,
                coreWeight: initialCoreWeight,
            };
        },
        input(prevState) {
            const maxInput = (outputBuffer * 3) - prevState.unusedEnergy;
            return [
                {
                    stateMachine: REACTOR_ID,
                    property: 'energy',
                    max: maxInput,
                },
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'converterEnergy',
                    priority: -100,
                },
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'capacitorEnergy',
                    priority: -100,
                },
                {
                    stateMachine: ENERGY_DISTRIBUTOR_ID,
                    property: 'coreEnergy',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            let converterBuffer = input.converterEnergy;
            let capacitorBuffer = input.capacitorEnergy;
            let coreBuffer = input.coreEnergy;

            let energy = prevState.unusedEnergy + input.energy;

            let iterations = 0;
            while (energy > 0 && iterations < 10) {
                iterations++;

                const converterBufferFull = converterBuffer >= outputBuffer;
                const capacitorBufferFull = capacitorBuffer >= outputBuffer;
                const coreBufferFull = coreBuffer >= outputBuffer;
                if (converterBufferFull && capacitorBufferFull && coreBufferFull) {
                    break;
                }

                const weightTotal = (converterBufferFull ? 0 : prevState.converterWeight) + (capacitorBufferFull ? 0 : prevState.capacitorWeight ) + (coreBufferFull ? 0 : prevState.coreWeight);
                if (weightTotal <= 0) {
                    break;
                }

                if (!coreBufferFull && prevState.coreWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - coreBuffer, Math.max(energy * (prevState.coreWeight / weightTotal), 1), energy);
                    coreBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
                if (!converterBufferFull && prevState.converterWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - converterBuffer, Math.max(energy * (prevState.converterWeight / weightTotal), 1), energy);
                    converterBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
                if (!capacitorBufferFull && prevState.capacitorWeight > 0) {
                    const addedEnergy = Math.min(outputBuffer - capacitorBuffer, Math.max(energy * (prevState.capacitorWeight / weightTotal), 1), energy);
                    capacitorBuffer += addedEnergy;
                    energy -= addedEnergy;
                }
            }

            return {
                unusedEnergy: energy,
                converterEnergy: converterBuffer,
                capacitorEnergy: capacitorBuffer,
                coreEnergy: coreBuffer,
                converterWeight: prevState.converterWeight,
                capacitorWeight: prevState.capacitorWeight,
                coreWeight: prevState.coreWeight,
            };
        },
    };
}
