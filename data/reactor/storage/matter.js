// @flow

import type {StateMachine} from '../../../src/program';
import type {Config} from '../../be13';

export const STORAGE_MATTER_ID = 'storage-matter';

export default function createStorageMatter(config: Config): StateMachine {
    const maxReleasedMatter = config.value(STORAGE_MATTER_ID, 'maxReleasedMatter');

    return {
        id: STORAGE_MATTER_ID,
        public: {
            releasedMatterPerTick: {
                min: 0,
                max: maxReleasedMatter,
            },
        },
        output: ['releasedMatter'],
        initialState() {
            return {
                matter: config.initial(STORAGE_MATTER_ID, 'matter'),
                releasedMatterPerTick: 0,
                releasedMatter: 0,
            }
        },
        input(prevState) {
            return [
                {
                    stateMachine: STORAGE_MATTER_ID,
                    property: 'releasedMatter',
                    as: 'unusedMatter',
                    priority: -100,
                },
            ];
        },
        update(prevState, input) {
            const releasedMatter = Math.min(prevState.releasedMatterPerTick, prevState.matter);
            return {
                matter: (prevState.matter - releasedMatter) + input.unusedMatter,
                releasedMatterPerTick: prevState.releasedMatterPerTick,
                releasedMatter,
            };
        },
    };
}