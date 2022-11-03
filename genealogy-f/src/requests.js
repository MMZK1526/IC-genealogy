export class Requests {
    baseUrl = 'https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com'

    search(name='silvia') {
        const url = `${this.baseUrl}/search?q=${name}`;
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relations({id = 'WD-Q152308', depth = 2} = {}) {
        const url = `${this.baseUrl}/relations_wk?id=${id}&depth=${depth}`
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relationCalc({start, relations}) {
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

}

