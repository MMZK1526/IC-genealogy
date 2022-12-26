// Shared opacity level constants.
export class Opacity {
    static normal = '0.9';
    static outlier = '0.5';
    static hidden = '0.2';
}

// global map from id of person to their attributes, used to change opacity for filtering in the goJs diagram.
export let relMap = new Map();
export const setRelMap = (newMap) => {
    relMap = newMap;
}
