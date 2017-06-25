import {createInitialState} from '../src/state';
import update from '../src/update';

import prototype from '../data/prototype';
import be13 from '../data/be13';

export default {
    createInitialState,
    update,
    Program: {
        Prototype: prototype(),
        BE13: be13(),
    },
};
