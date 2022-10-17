export class Requests {
    search(name) {
        const url = `https://intense-anchorage-84008.herokuapp.com/https://db-de-genealogie.herokuapp.com/search?q=${name}`;
        return fetch(url, {
            // mode: 'no-cors'
        })
            .then(response => {
                return response.json();
            })
            .catch((error) => {
                console.error(`Error: ${error}`);
            });
    }
}

