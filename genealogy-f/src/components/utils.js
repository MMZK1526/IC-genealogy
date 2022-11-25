import _ from "lodash";
import { Requests } from './requests';
import util from "util";

export class Utils {
    static get relationsKeywords() { return ['spouse', 'father', 'mother', 'child', 'kinship']; }
    static get locationKeywords() { return ['place of birth', 'place of death']; }
    static get specialKeywords() { return ['name', 'description', 'wikipedia link', 'image']; }

    constructor() {
        this.requests = new Requests();
    }

    processRelations = async (data) => {
        const chosenId = data.targets[0].id;
        return {
            id: chosenId,
            data: await this.addKinship(chosenId, data),
        };
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
            }
            const kinshipStrs = kinshipJSON[key].kinship.map((arr) => {
                arr.reverse();
                return arr.join(' of the ');
            });

            if (!relationsJSON.items[key]) {
                continue;
            }
            kinshipStrs.forEach((str) => item.kinships.push({ 'kinship': str, 'path': kinshipJSON.path }));
        }

        return relationsJSON;
    }
}

export function setStatePromise(thisRef) {
    return util.promisify(thisRef.setState);
}

export function getIds(relationsJSON) {
    return Array.from(relationsJSON.items.map(x => x.id));
}

export async function wait(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}
