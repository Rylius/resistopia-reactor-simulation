import {createInitialState} from '../src/state';
import update from '../src/update';

import {clean, validate} from './program';

import prototype from '../data/prototype';

const programs = {
    Prototype: prototype(),
};

Object.keys(programs).forEach(id => {
    const program = programs[id];

    clean(program);
    validate(program);
});

export default {
    createInitialState,
    update,
    Program: programs,
};
