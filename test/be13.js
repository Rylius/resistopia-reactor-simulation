import {createInitialState} from '../src/state';
import update from '../src/update';

import be13 from '../data/be13';

const program = be13();

let state = createInitialState(program);
state.stateMachines['storage-matter'].releasedMatterPerTick = 500;
state.stateMachines['storage-antimatter'].releasedAntimatterPerTick = 500;
state.stateMachines['energy-converter'].energyConversion = 100;
state.stateMachines['reactor-cooling'].cooling = 150;
for (let i = 0; i < 20; i++) {
    state = update(program, state);
    console.log('--------------------');
    console.log(state);
}
// state = update(prototypeProgram, state);
// console.log(state);
