import _ from "lodash";
import util from "util";

const BLOODLINE_ONLY_EXTEND = true;

export class Utils {
    constructor(requests) {
        this.requests = requests;
    }

    static get relationsKeywords() {
        return ['spouse', 'father', 'mother', 'child', 'kinship'];
    }

    static get locationKeywords() {
        return ['place of birth', 'place of death'];
    }

    static get specialKeywords() {
        return ['name', 'description', 'wikipedia link', 'image'];
    }

    extendRelations = async (id, relationsJSON) => {
        console.assert(!_.isEmpty(relationsJSON));
        const oldRelationsJSON = structuredClone(relationsJSON);
        const newRelationsJSON = await this.fetchRelations(id);
        const mergedRelationsJSONTemp = this.mergeRelations(oldRelationsJSON, newRelationsJSON);
        return await this.addKinship(id, mergedRelationsJSONTemp);
    }

    mergeRelations = (oldRel, newRel) => {
        const res = {};
        res.targets = oldRel.targets;
        const idItemMap = new Map();
        for (const item of oldRel.items) {
            idItemMap.set(item.id, item);
        }
        const idRelMap = new Map();
        for (const rel of oldRel.relations) {
            idRelMap.set(`${rel.item1Id} ${rel.item2Id}`, rel);
        }
        for (const item of newRel.items) {
            if (!idItemMap.has(item.id)) {
                idItemMap.set(item.id, item);
            }
        }
        for (const rel of newRel.relations) {
            const key = `${rel.item1Id} ${rel.item2Id}`;
            if (!idRelMap.has(key)) {
                idRelMap.set(key, rel);
            }
        }
        res.items = Array.from(idItemMap.values());
        res.relations = Array.from(idRelMap.values());
        return res;
    }

    fetchRelations = async (id) => {
        const relations = await this.requests.relations({ id: id });
        return await this.addKinship(
            id,
            relations,
        );
    }

    addKinship = async (id, relationsJSON) => {
        const kinshipJSON = await this.requests.relationCalc(
            { start: id, relations: Object.values(relationsJSON.relations).flat() });
        return this.addKinshipHelper(kinshipJSON, relationsJSON);
    }

    addKinshipHelper = (kinshipJSON, relationsJSON) => {
        for (const key of Object.keys(kinshipJSON)) {
            const item = relationsJSON.items[key];
            if (item.kinships === undefined) {
                item.kinships = [];
                item.kinshipKeys = new Set();
            }
            const kinshipStrs = kinshipJSON[key].map((arr) => {
                arr.relation.reverse();
                return arr.relation.join(' of the ');
            });

            if (!relationsJSON.items[key]) {
                continue;
            }
            kinshipStrs.forEach((str, ix) => {
                const path = kinshipJSON[key][ix].path;
                const pathKey = path.join('');
                if (!item.kinshipKeys.has(pathKey)) {
                    item.kinshipKeys.add(pathKey);
                    item.kinships.push({ 'kinship': str, 'path': kinshipJSON[key][ix].path });
                }
            });
        }

        return relationsJSON;
    }
}

export class CustomTimer {
    constructor(name) {
        this.name = name;
        this.t1 = Date.now();
    }

    end = () => {
        const t2 = Date.now();
        const delta = (t2 - this.t1) / 1_000;
        console.log(`${this.name} took ${delta}s`);
    }
}

export function setStatePromise(thisRef) {
    return util.promisify(thisRef.setState);
}

export function getIds(relationsJSON) {
    return Array.from(relationsJSON.items.map(x => x.id));
}

export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function cleanIfNeeded(tree) {
    if (isClean(tree)) {
        return tree;
    }
    return clean(tree);
}

export function isClean(tree) {
    return noUndefinedItems(tree) && noPhantomRelations(tree);
}

function noUndefinedItems(tree) {
    const items = new Set(Object.values(tree.items));
    return !items.has(undefined);
}

function noPhantomRelations(tree) {
    const itemIds = new Set(Object.keys(tree.items));
    const relationIdsKey = new Set(Object.keys(tree.relations));
    const relationIdsVal1 = new Set(Object.values(tree.relations).flat().map(x => x.item1Id));
    const relationIdsVal2 = new Set(Object.values(tree.relations).flat().map(x => x.item2Id));
    const relationIds = new Set([...relationIdsKey, ...relationIdsVal1, ...relationIdsVal2]);
    return eqSet(itemIds, relationIds);
}

export function eqSet(xs, ys) {
    return xs.size === ys.size &&
        [...xs].every((x) => ys.has(x));
}

export function clean(tree) {
    return prunePhantomRelations(pruneUndefinedItems(tree));
}

function prunePhantomRelations(tree) {
    const treeCpy = JSON.parse(JSON.stringify(tree));
    const itemIds = new Set(Object.keys(treeCpy.items));
    treeCpy.relations = Object.fromEntries(
        Object.entries(treeCpy.relations)
            .filter(([id, _]) => itemIds.has(id))
            .map(([k, arr]) => (
                [k,
                    arr.filter(x => (
                        itemIds.has(x.item1Id) &&
                        itemIds.has(x.item2Id)
                    ))]
            ))
            .filter(([id, arr]) => (
                !_.isEmpty(arr)
            ))
    );
    return treeCpy;
}

function pruneUndefinedItems(tree) {
    const treeCpy = JSON.parse(JSON.stringify(tree));
    treeCpy.items = Object.fromEntries(
        Object.entries(treeCpy.items)
            .filter(([_, v]) => v !== undefined)
    );
    return treeCpy;
}

export function subTree(tree, startId, depth) {
    let toDo = new Map();
    toDo.set(startId, 0);
    const done = new Set();
    while (!_.isEmpty(toDo)) {
        for (const [id, offset] of toDo) {
            if (BLOODLINE_ONLY_EXTEND && id !== startId) {
                toDo.delete(id);
                done.add(id);
                continue;
            }
            console.assert(id in tree.relations);
            const neighbours = (tree.relations)[id].map(y => {
                const id = y.item1Id;
                const yOffset = calcOffset(y.type) + offset;
                return [id, yOffset];
            }).filter(([id, yOffset]) => Math.abs(yOffset) <= depth);
            toDo.delete(id);
            done.add(id);
            for (const [id, offset] of neighbours) {
                if (!done.has(id)) {
                    toDo.set(id, offset);
                }
            }
        }
    }

    const subTree = {};
    subTree.targets = JSON.parse(JSON.stringify(tree.targets));
    subTree.items = {};
    subTree.relations = {};

    for (const id of done) {
        if (!(id in tree.items)) {
            throw new Error();
        }
        console.assert(id in tree.items);
        subTree.items[id] = tree.items[id];

        if (!(id in tree.relations)) {
            throw new Error();
        }
        console.assert(id in tree.relations);
        subTree.relations[id] = tree.relations[id].filter(({ item1Id }) => done.has(item1Id));
    }

    return subTree;
}

function calcOffset(type) {
    const zero = new Set(['spouse']);
    const minusOne = new Set(['child']);
    const plusOne = new Set(['father', 'mother']);

    if (zero.has(type)) {
        return 0;
    }
    if (minusOne.has(type)) {
        return -1;
    }
    if (plusOne.has(type)) {
        return 1;
    }
    throw Error(```
Unrecognized relationship type detected 
when calculating depth offset
    ```.trim());
}
