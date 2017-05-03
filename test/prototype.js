import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';

const prototypeProgram = prototype();

let state = createInitialState(prototypeProgram);
state.stateMachines['storage-matter'].releasedMatterPerSecond = 500;
state.stateMachines['storage-antimatter'].releasedAntimatterPerSecond = 500;
state = update(prototypeProgram, state, 1);
state = update(prototypeProgram, state, 1);
state = update(prototypeProgram, state, 5);
state = update(prototypeProgram, state, 1);
console.log(state);
