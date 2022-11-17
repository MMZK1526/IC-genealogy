import { wait } from "./utils";
import _ from 'lodash';

export class Requests {
    baseUrl = 'https://db-de-genealogie.herokuapp.com';
    // baseUrl = 'http://0.0.0.0:8080';

    search = async (name = 'silvia') => {
        const url = `${this.baseUrl}/search?q=${name}`;
        return await this.genericRequest({ requestOrUrl: url });
    }

    relationsCacheAndWiki = ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const params = {id: id, depth: depth, visitedItems: visitedItems};
        return [
            this.relationsDb(params),
            this.relations(params),
        ];
    }

    // { targets: [], items: {}, relations: {} }
    relationsCacheOrWiki = async ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const params = {id: id, depth: depth, visitedItems: visitedItems};
        const dbRes = await this.relationsDb(params);
        if (!this.dbResEmpty(dbRes)) {
            // console.log('Database used to fetch data');
            return dbRes;
        }
        const wikiDataRes = await this.relations(params);
        // console.log('Wiki data used to fetch data');
        return wikiDataRes;
    }

    relations = async ({ id = 'WD-Q152308', depth = 2, visitedItems = [] } = {}) => {
        const url = `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}`;
        return await this.genericPost(url, visitedItems, id, depth).then(x => {
            console.log('Wiki data used to fetch data');
            return x;
        });
    }

    relationsDb = async ({ id = 'WD-Q152308', depth = 2, visitedItems = [] } = {}) => {
        const url = `${this.baseUrl}/relations_db?id=${id}&depth=${depth}`;
        return await this.genericPost(url, visitedItems, id, depth).then(x => {
            console.log('Database used to fetch data');
            return x;
        });
    }

    relationCalc = async ({ start, relations }) => {
        const url = `${this.baseUrl}/relation_calc`;
        const body = {
            start: start,
            relations: relations,
        };
        return await this.genericPost(url, body);
    }

    async genericPost(url, body, id = null, depth = null) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const request = new Request(
            url,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
            }
        );
        return await this.genericRequest({ requestOrUrl: request, id, depth });
    }

    async genericRequest({ requestOrUrl, id = null, depth = null, retryNum = 3, totalRetry = 3 } = {}) {
        const response = await fetch(requestOrUrl);
        const ok = response.ok;
        const status = response.status;
        if (status === 503 && retryNum > 0) {
            console.log(`Request retry number ${totalRetry - retryNum + 1}`);
            const waitTime = (totalRetry + 1 - retryNum) * 1_000;
            await wait(waitTime);
            await this.genericRequest({ requestOrUrl, id, depth, retryNum: retryNum - 1 });
            return;
        }
        if (!ok) {
            const activity = (id !== null && depth !== null) ?
                `fetching id ${id} with depth ${depth}` :
                'performing http request';
            throw new Error(`Error when ${activity} - status: ${response.status}\n${response.statusText}`);
        }
        const resText = await response.text();
        try {
            return JSON.parse(resText);
        } catch {
            throw new Error(`Error while JSON-parsing the following text response:\n${resText}`);
        }
    }

    dbResEmpty = (dbRes) => {
        return _.isEmpty(Object.values(dbRes).filter(x => !_.isEmpty(x)));
    }
}

