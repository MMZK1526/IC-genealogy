import {CustomTimer, wait} from "./utils";
import _ from 'lodash';
import WebSocketAsPromised from 'websocket-as-promised';
import {Mutex} from 'async-mutex';

const USE_SOCKETS = true;

const USE_LOCAL_BACKEND = true;
const USE_SSL = false;

const USE_DB = true;

export class Requests {
    rawUrl = USE_LOCAL_BACKEND ? 'localhost:8080' : 'db-de-genealogie.herokuapp.com';
    baseUrl = USE_SSL ? `https://${this.rawUrl}` : `http://${this.rawUrl}`;
    wsUrl = USE_SSL ? `wss://${this.rawUrl}/relations_ws` : `ws://${this.rawUrl}/relations_ws`;

    constructor() {
        if (USE_SOCKETS) {
            this.mutex = new Mutex();
            this.socket = new WebSocketAsPromised(this.wsUrl, {
                packMessage: data => JSON.stringify(data),
                unpackMessage: data => JSON.parse(data),
                attachRequestId: (data, requestId) => Object.assign({requestId}, data),
                extractRequestId: data => data && data.requestId,
            });
            this.socket.onClose.addListener(event => {
                console.log(`Connection closed: ${event.reason}.`);
            });
        }
    }

    search = (name = 'silvia') => {
        const url = `${this.baseUrl}/search?q=${name}`;
        return this.genericRequest({requestOrUrl: url});
    }

    relationsCacheAndWiki = ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        const params = {id: id, depth: depth, visitedItems: visitedItems, allSpouses: allSpouses};
        return [
            this.relationsDb(params),
            this.relations(params),
        ];
    }

    // { targets: [], items: {}, relations: {} }
    relationsCacheOrWiki = async ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const params = {id: id, depth: depth, visitedItems: visitedItems};
        const dbRes = await this.relationsDbHttp(params);
        if (!this.dbResEmpty(dbRes)) {
            // console.log('Database used to fetch data');
            return dbRes;
        }
        const wikiDataRes = await this.relations(params);
        // console.log('Wiki data used to fetch data');
        return wikiDataRes;
    }

    relations = ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        let params = {id, depth, visitedItems, allSpouses};
        if (USE_SOCKETS) {
            return this.relationsWebSocket(params);
        }
        return this.relationsHttp(params);
    }

    relationsDb = ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        let params = {id, depth, visitedItems, allSpouses};
        if (USE_SOCKETS) {
            return this.relationsDbWebSocket(params);
        }
        return this.relationsDbHttp(params);
    }

    relationsWebSocket = async ({
                                              id = 'WD-Q152308',
                                              depth = 2,
                                              visitedItems = [],
                                              allSpouses = true
                                          } = {}) => {
        await this.ensureSocketConnected();
        const request = {
            id,
            depth,
            homoStrata: null,
            heteroStrata: allSpouses ? 'WD-P22,WD-P25,WD-P26,WD-P40' : null,
            visitedItems,
            endpoint: 'wk',
        };
        const tBackend = new CustomTimer("Backend");
        const response = await this.socket.sendRequest(request, {
            requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        });
        tBackend.end();
        const errorMessage = response.errorMessage;
        if (errorMessage) {
            throw new Error(```
Error: ${errorMessage.statusCode}
${errorMessage.message}
            ```.trim());
        }
        return response.response;
    }

    relationsDbWebSocket = async ({
                                              id = 'WD-Q152308',
                                              depth = 2,
                                              visitedItems = [],
                                              allSpouses = true
                                          } = {}) => {
        await this.ensureSocketConnected();
        const request = {
            id,
            depth,
            homoStrata: null,
            heteroStrata: allSpouses ? 'WD-P22,WD-P25,WD-P26,WD-P40' : null,
            visitedItems,
            endpoint: 'db',
        };
        const tBackend = new CustomTimer("Backend");
        const response = await this.socket.sendRequest(request, {
            requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        });
        tBackend.end();
        const errorMessage = response.errorMessage;
        if (errorMessage) {
            throw new Error(```
Error: ${errorMessage.statusCode}
${errorMessage.message}
            ```.trim());
        }
        return response.response;
    }

    relationsHttp = async ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        const url = allSpouses
            ? `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}`
            : `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}&homo_strata=&hetero_strata=WD-P22,WD-P25,WD-P26,WD-P40`;
        return await this.genericPost(url, visitedItems, id, depth).then(x => {
            console.log('Wiki data used to fetch data');
            return x;
        });
    }

    relationsDbHttp = async ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        if (!USE_DB) {
            return {targets: [], items: {}, relations: {}};
        }
        const url = allSpouses
            ? `${this.baseUrl}/relations_db?id=${id}&depth=${depth}`
            : `${this.baseUrl}/relations_db?id=${id}&depth=${depth}&homo_strata=&hetero_strata=WD-P22,WD-P25,WD-P26,WD-P40`;
        return this.genericPost(url, visitedItems, id, depth).then(x => {
            console.log('Database used to fetch data');
            return x;
        });
    }

    ensureSocketConnected = async () => {
        await this.mutex.acquire();
        await this.ensureSocketConnectedHelper();
        this.mutex.release();
    }

    ensureSocketConnectedHelper = async () => {
        const first = this.socket.isClosed;
        const tOpen = (first) ? new CustomTimer("Opening socket") : null;
        await this.socket.open();
        if (first) {
            console.log('Connection opened');
            tOpen.end();
            this.keepSocketOpen();
        }
    }

    keepSocketOpen = async () => {
        let first = true;
        while (true) {
            const request = {
                endpoint: 'ping',
                id: 'foo',
                depth: 0,
                homoStrata: null,
                heteroStrata: null,
                visitedItems: [],
            };
            const tPing = (first) ? new CustomTimer("First pinging") : null;
            await this.socket.sendRequest(request, {
                requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
            });
            console.log('Pinged backend');
            if (first) {
                tPing.end();
                first = false;
            }
            await wait(10_000);
        }
    }

    relationCalc = ({start, relations}) => {
        const url = `${this.baseUrl}/relation_calc`;
        const body = {
            start: start,
            relations: relations,
        };
        return this.genericPost(url, body);
    }

    genericPost = (url, body, id = null, depth = null) => {
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
        return this.genericRequest({requestOrUrl: request, id, depth});
    }

    genericRequest = async ({requestOrUrl, id = null, depth = null, retryNum = 3, totalRetry = 3} = {}) => {
        const response = await fetch(requestOrUrl);
        const ok = response.ok;
        const status = response.status;
        // if (status === 503 && retryNum > 0) {
        //     console.log(`Request retry number ${totalRetry - retryNum + 1}`);
        //     const waitTime = (totalRetry + 1 - retryNum) * 1_000;
        //     await wait(waitTime);
        //     await this.genericRequest({requestOrUrl, id, depth, retryNum: retryNum - 1});
        //     return;
        // }
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

