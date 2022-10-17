export class Requests {
    search(name='eli') {
        const url = `https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com/search?q=${name}`;
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

    relations({id = 'WD-Q9682', depth = 0, types = 'all'} = {}) {
        const url = `https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com/relations?id=${id}&depth=${depth}&types=${types}`
        return fetch(url)
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }

}

