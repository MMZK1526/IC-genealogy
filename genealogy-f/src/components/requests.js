import {CustomTimer, wait} from "./utils";
import _ from 'lodash';
import WebSocketAsPromised from 'websocket-as-promised';

const USE_HTTPS = false;
const USE_SOCKETS = true;
const USE_WEB_SOCKETS_AS_PROMISED = true;
const USE_LOCAL_BACKEND = true;


export class Requests {
    rawUrl = USE_LOCAL_BACKEND ? 'localhost:8080' : 'db-de-genealogie.herokuapp.com';
    baseUrl = USE_HTTPS ? `https://${this.rawUrl}` : `http://${this.rawUrl}`;
    wsUrl = `ws://${this.rawUrl}`;

    constructor() {
        if (USE_SOCKETS) {
            this.socket = null;
            const ws_url = `${this.wsUrl}/relations_wk_ws`;
            if (!USE_WEB_SOCKETS_AS_PROMISED) {
                this.connectToVanillaWebSocket(ws_url);
                this.t = null;
            }
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
        const dbRes = await this.relationsDb(params);
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
        if (!USE_SOCKETS) {
            return this.relationsHttp(params)
        }
        if (USE_WEB_SOCKETS_AS_PROMISED) {
            return this.relationsWebSocketAsPromised(params);
        }
        return this.relationsVanillaWebSocket(params);
    }

    relationsVanillaWebSocket = async ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        const request = {
            requestId: 42,
            id,
            depth,
            homoStrata: null,
            heteroStrata: allSpouses ? 'WD-P22,WD-P25,WD-P26,WD-P40' : null,
            visitedItems,
            ping: null,
        };
        this.t = new CustomTimer("All");
        this.socket.send(JSON.stringify(request));
        return {};
    }

    relationsWebSocketAsPromised = async ({
                                              id = 'WD-Q152308',
                                              depth = 2,
                                              visitedItems = [],
                                              allSpouses = true
                                          } = {}) => {
        const t = new CustomTimer("All");
        const url = `${this.wsUrl}/relations_wk_ws`;
        if (this.socket === null) {
            const tOpen = new CustomTimer("Opening socket");
            await this.connectToSocketAsPromised(url);
            tOpen.end();
            const tPing = new CustomTimer("Pinging");
            this.keepSocketAsPromisedOpen();
            tPing.end();
        }
        const request = {
            id,
            depth,
            homoStrata: null,
            heteroStrata: allSpouses ? 'WD-P22,WD-P25,WD-P26,WD-P40' : null,
            visitedItems,
            ping: null,
        };
        const tBackend = new CustomTimer("Backend");
        const response = await this.socket.sendRequest(request, {
            requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        });
        tBackend.end();
        console.log('Received websocket response');
        const errorMessage = response.errorMessage;
        if (errorMessage) {
            throw new Error(```
Error: ${errorMessage.statusCode}
${errorMessage.message}
            ```.trim());
        }
        t.end();
        return response.response;
    }

    connectToVanillaWebSocket = (url) => {
        this.socket = new WebSocket(url);

        this.socket.onconnect = async (event) => {
            await this.relations();
        };

        this.socket.onmessage = (event) => {
            const textData = event.data;
            console.log('Received websocket response');
            console.log(JSON.stringify(textData).substring(0, 100));
            this.t.end();
        };

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
            } else {
                console.log('[close] Connection died');
            }
        };

        this.socket.onerror = (error) => {
            throw new Error(error);
        };
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

    keepSocketAsPromisedOpen = async () => {
        while (true) {
            const request = {
                id: 'foo',
                depth: 0,
                homoStrata: null,
                heteroStrata: null,
                visitedItems: [],
                ping: 'ping',
            };
            await this.socket.sendRequest(request, {
                requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
            });
            console.log('Pinged backend');
            await wait(10_000);
        }
    }

    connectToSocketAsPromised = (url) => {
        this.socket = new WebSocketAsPromised(url, {
            packMessage: data => JSON.stringify(data),
            unpackMessage: data => JSON.parse(data),
            attachRequestId: (data, requestId) => Object.assign({requestId}, data), // attach requestId to message as `id` field
            extractRequestId: data => data && data.requestId,                                  // read requestId from message `id` field
        });
        this.socket.onClose.addListener(event => {
            console.log(`Connections closed: ${event.reason}.`);
        });
        return this.socket.open().then(() => console.log('Connection opened'));
    }

    relationsDb = async ({id = 'WD-Q152308', depth = 2, visitedItems = [], allSpouses = true} = {}) => {
        return {targets: [], items: {}, relations: {}};
        const url = allSpouses
            ? `${this.baseUrl}/relations_db?id=${id}&depth=${depth}`
            : `${this.baseUrl}/relations_db?id=${id}&depth=${depth}&homo_strata=&hetero_strata=WD-P22,WD-P25,WD-P26,WD-P40`;
        return this.genericPost(url, visitedItems, id, depth).then(x => {
            console.log('Database used to fetch data');
            return x;
        });
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
        if (status === 503 && retryNum > 0) {
            console.log(`Request retry number ${totalRetry - retryNum + 1}`);
            const waitTime = (totalRetry + 1 - retryNum) * 1_000;
            await wait(waitTime);
            await this.genericRequest({requestOrUrl, id, depth, retryNum: retryNum - 1});
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

