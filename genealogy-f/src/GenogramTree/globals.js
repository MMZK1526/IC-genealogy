// global map from id of person to their attributes, used to change opacity for filtering in the goJs diagram.
export let relMap = new Map();
export const setRelMap = (newMap) => {
    relMap = newMap;
}
