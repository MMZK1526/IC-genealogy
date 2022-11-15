export class Requests {
    baseUrl = 'https://db-de-genealogie.herokuapp.com';
    // baseUrl = 'http://0.0.0.0:8080';

    search = async (name='silvia') => {
        const url = `${this.baseUrl}/search?q=${name}`;
        return await this.genericRequest(url);
    }

    relationsCacheOrWiki = async ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const params = {id: id, depth: depth, visitedItems: visitedItems};
        try {
            return await Promise.any([
                this.relationsDb(params),
                this.relations(params),
            ]).then(
                (x) => {
                    console.log(`${x.source} used to fetch data`);
                    return x.data;
                }
            );
        } catch (e) {
            throw new Error(
                `Error executing Promise.any - ${e.constructor.name}.
Individual errors:
Error from db fetch:
${e.errors[0]}
Error from wiki fetch:
${e.errors[1]}`
            );
        }
    }

    relations = async ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const url = `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}`;
        return await this.genericPost(url, visitedItems, id, depth).then(
            (x) => ({data: x, source: 'WikiData'})
        );
    }

    relationsDb = async ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const url = `${this.baseUrl}/relations_db?id=${id}&depth=${depth}`;
        return await this.genericPost(url, visitedItems, id, depth).then(
            (x) => ({data: x, source: 'Database'})
        );
    }

    relationCalc = async ({start, relations}) => {
        const url = `${this.baseUrl}/relation_calc`;
        const body = {
            start: start,
            relations: relations,
        };
        return await this.genericPost(url, body);
    }

    async genericPost(url, body, id=null, depth=null) {
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
        return await this.genericRequest(request, id, depth);
    }

    async genericRequest(requestOrUrl, id=null, depth=null) {
        const response = await fetch(requestOrUrl);
        const ok = response.ok;
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
}

