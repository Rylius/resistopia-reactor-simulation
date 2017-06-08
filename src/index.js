import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';

export default {
    createInitialState,
    update,
    Program: {
        Prototype: prototype(),
    },
};
