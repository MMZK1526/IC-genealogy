import './App.css';
import {Requests} from './requests';
import React from "react";

class App extends React.Component {
    render() {
        return (
            <NameForm/>
        );
    }
}

class NameForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            initialName: '',
            disambiguationJsons: [],
            chosenId: '',
            relationsJson: {},
        };
        this.requests = new Requests();

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange2 = this.handleChange2.bind(this);
        this.handleSubmit2 = this.handleSubmit2.bind(this);
    }

    handleChange(event) {
        this.setState({initialName: event.target.value});
    }

    handleChange2(event) {
        this.setState({chosenId: event.target.value});
    }


    render() {
        return (
            <div>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        Name:
                        <input type="text" value={this.state.initialName} onChange={this.handleChange}/>
                    </label>
                    <input type="submit" value="Submit"/>
                </form>
                <div>
                    {this.state.disambiguationJsons
                        ? this.tableFromArray('disambiguation', this.state.disambiguationJsons)
                        : 'No data fetched'
                    }
                </div>
                {this.state.disambiguationJsons
                    ? <form onSubmit={this.handleSubmit2}>
                        <label>
                            Disambiguation:
                            <select value={this.state.chosenId} onChange={this.handleChange2}>
                                {
                                    this.state.disambiguationJsons.map((x) =>
                                        <option value={x.id} key={x.id}>{x.name}</option>
                                    )
                                }
                            </select>
                        </label>
                        <input type="submit" value="Submit" />
                    </form>
                    : 'No data fetched'
                }
                <div>
                    {this.state.relationsJson
                        ? Object.entries(this.state.relationsJson).map((kv) => {
                            let y = kv[1];
                            if (!Array.isArray(y)) {
                                y = [y];
                            }
                            console.assert(Array.isArray(y));
                            return this.tableFromArray(kv[0], y);
                        })
                        : 'No data fetched'
                    }
                </div>
            </div>
        );
    }

    tableFromArray(title, arr) {
        let keys = arr.length > 0 ? Object.keys(arr[0]) : [];
        return (
            <div>
                <h3>
                    {title}
                </h3>
                <table key={title}>
                    <thead>
                        <tr>
                            {
                                keys.map((k) => (
                                    <th key={k}>{k}</th>
                                ))
                            }
                        </tr>
                    </thead>
                    <tbody>
                    {
                        arr.map((x, ix) => (
                            <tr key={ix}>
                                {
                                    Object.entries(x).map((kv) => (
                                        <td key={kv[0]}>{kv[1]}</td>
                                    ))
                                }
                            </tr>
                        ))
                    }
                    </tbody>

                </table>
            </div>
        );
    }

    async handleSubmit(event) {
        event.preventDefault();
        await this.requests.search(this.state.initialName).then(r => {
            this.setState({
                disambiguationJsons: r,
                chosenId: r[0].id
            });
        });

    }

    async handleSubmit2(event) {
        event.preventDefault();
        await this.requests.relations({id: this.state.chosenId}).then(r => {
            this.setState({
                relationsJson: r
            });
        });
    }

}



export default App;
