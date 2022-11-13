export class Requests {
    baseUrl = 'https://db-de-genealogie.herokuapp.com'
    // baseUrl = 'http://0.0.0.0:8080'

    search = (name='silvia') => {
        const url = `${this.baseUrl}/search?q=${name}`;
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relations = ({id = 'WD-Q152308', depth = 2, visitedItems = []} = {}) => {
        const url = `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}`
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const request = new Request(
            url,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(visitedItems),
            }
        );
        return fetch(request)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relationsDb = ({id = 'WD-Q152308', depth = 2, visitedItems = ""} = {}) => {
        const url = `${this.baseUrl}/relations_db?id=${id}&depth=${depth}`
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const request = new Request(
            url,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(visitedItems),
            }
        );
        return fetch(request)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relationCalc = ({start, relations}) => {
        const url = `${this.baseUrl}/relation_calc`;
        const body = {
            start: start,
            relations: relations,
        };
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
        return fetch(request)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relationsBulk = (ids) => {
        const promises = Array.from(ids.map(x => this.relations({id: x})));
        return Promise.all(promises);
    }
}

