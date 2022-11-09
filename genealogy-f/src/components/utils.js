import _ from "lodash";
import {Requests} from './requests';
import util from "util";

export class Utils {
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
        const relations = await this.requests.relations({id: id});
        return await this.addKinship(
            id,
            relations,
        );
    }

    addKinship = async (id, relationsJson) => {
        const kinshipJson = await this.requests.relationCalc(
            {start: id, relations: relationsJson.relations});
        return this.addKinshipHelper(kinshipJson, relationsJson);
    }

    addKinshipHelper = (kinshipJson, relationsJson) => {
        const idItemMap = new Map();
        for (const item of relationsJson.items) {
            idItemMap.set(item.id, item);
        }
        for (const key of Object.keys(kinshipJson)) {
            const kinshipStr = kinshipJson[key].map((arr) => {
                arr.reverse();
                return arr.join(' of the ');
            }).join('; ');
            const property = {
                propertyId: 'PB-kinship',
                name: 'relation to the searched person',
                value: kinshipStr,
                valueHash: null,
            };
            if (!idItemMap.has(key)) {
                console.log(key);
            }
            console.assert(idItemMap.has(key));
            const item = idItemMap.get(key);
            const props = item.additionalProperties;
            props.push(property);
            item.additionalProperties = props;
            idItemMap.set(key, item);
        }
        const newItems = Array.from(idItemMap.values());
        const res = relationsJson;
        res.items = newItems;
        return res;
    }

    setStatePromise = (thisRef) => {
        return util.promisify(thisRef.setState);
    }
}