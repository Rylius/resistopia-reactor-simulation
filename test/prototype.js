import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';

const program = prototype();

let state = createInitialState(program);
state.stateMachines['storage-matter'].releasedMatterPerTick = 500;
state.stateMachines['storage-antimatter'].releasedAntimatterPerTick = 500;
state.stateMachines['energy-distributor'].converterWeight = 1;
state.stateMachines['energy-converter'].energyConversion = 300;
state.stateMachines['reactor-cooling'].cooling = 90;
for (let i = 0; i < 20; i++) {
    state = update(program, state);
    console.log('--------------------');
    console.log(state);
}
// state = update(prototypeProgram, state);
// console.log(state);
