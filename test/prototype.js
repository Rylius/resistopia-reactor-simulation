import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';

const prototypeProgram = prototype();

let state = createInitialState(prototypeProgram);
state.stateMachines['storage-matter'].releasedMatterPerTick = 900;
state.stateMachines['storage-antimatter'].releasedAntimatterPerTick = 900;
state.stateMachines['reactor-cooling'].cooling = 0;
for (let i = 0; i < 10; i++) {
    state = update(prototypeProgram, state);
    console.log('--------------------');
}
// state = update(prototypeProgram, state);
console.log(state);
