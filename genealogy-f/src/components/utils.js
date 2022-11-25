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

    extendRelations = async (id, relationsJson) => {
        console.assert(!_.isEmpty(relationsJson));
        const oldRelationsJson = structuredClone(relationsJson);
        const newRelationsJson = await this.fetchRelations(id);
        const mergedRelationsJsonTemp = this.mergeRelations(oldRelationsJson, newRelationsJson);
        return await this.addKinship(id, mergedRelationsJsonTemp);
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

    addKinship = async (id, relationsJson) => {
        const kinshipJson = await this.requests.relationCalc(
            { start: id, relations: Object.values(relationsJson.relations).flat() });
        return this.addKinshipHelper(kinshipJson, relationsJson);
    }

    addKinshipHelper = (kinshipJson, relationsJson) => {
        for (const key of Object.keys(kinshipJson)) {
            const kinshipStr = kinshipJson[key].map((arr) => {
                arr.reverse();
                return arr.join(' of the ');
            }).join('; ');
            console.assert(relationsJson.items[key]);
            const item = relationsJson.items[key];
            const props = item.additionalProperties;
            const prop = props.find((p) => p.propertyId == 'PB-kinship');
            if (prop) {
                prop.value = kinshipStr;
            } else {
                const property = {
                    propertyId: 'PB-kinship',
                    name: 'relation to the searched person',
                    value: kinshipStr,
                    valueHash: null,
                };
                props.push(property);
            }
            item.additionalProperties = props;
            relationsJson.items[key] = item;
        }

        return relationsJson;
    }
}

export function setStatePromise(thisRef) {
    return util.promisify(thisRef.setState);
}

export function getIds(relationsJson) {
    return Array.from(relationsJson.items.map(x => x.id));
}

export async function wait(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}
