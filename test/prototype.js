import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';

const program = prototype();

let state = createInitialState(program);
state.stateMachines['storage-matter'].releasedMatterPerTick = 500;
state.stateMachines['storage-antimatter'].releasedAntimatterPerTick = 500;
state.stateMachines['reactor-cooling'].cooling = 0;
for (let i = 0; i < 10; i++) {
    state = update(program, state);
    console.log('--------------------');
}
// state = update(prototypeProgram, state);
console.log(state);
