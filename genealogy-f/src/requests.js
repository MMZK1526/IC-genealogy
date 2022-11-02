export class Requests {
    search(name='silvia') {
        const url = `https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com/search?q=${name}`;
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relations({id = 'WD-Q152308', depth = 2} = {}) {
        const url = `https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com/relations_wk?id=${id}&depth=${depth}`
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

}

