export class Requests {
    search(name) {
        const url = `https://db-de-genealogie.herokuapp.com/search?q=${name}`;
        return fetch(url, {
            mode: 'no-cors', credentials: 'omit', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                return response.json();
            })
            .then(response => {
                return response;
            });
    }
}

