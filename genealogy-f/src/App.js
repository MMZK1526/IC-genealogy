import './App.css';
// import './FamilyTree.css';
import {Requests} from './requests';
import React from "react";
import {FamilyTree} from "./FamilyTree";
import _ from "lodash";

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
            searchJsons: [],
            chosenId: '',
            relationsJson: {},
        };
        this.requests = new Requests();

        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
        this.handleRelationsChange = this.handleRelationsChange.bind(this);
        this.handleRelationsSubmit = this.handleRelationsSubmit.bind(this);
    }

    render() {
        return (
            <div>
                <form onSubmit={this.handleSearchSubmit}>
                    <label>
                        Name:
                        <input type="text" value={this.state.initialName} onChange={this.handleSearchChange}/>
                    </label>
                    <input type="submit" value="Submit"/>
                </form>
                {/*<div>*/}
                {/*    {this.state.searchJsons*/}
                {/*        ? this.tableFromArray('disambiguation', this.state.searchJsons)*/}
                {/*        : 'No data fetched'*/}
                {/*    }*/}
                {/*</div>*/}
                {this.state.searchJsons
                    ? <form onSubmit={this.handleRelationsSubmit}>
                        <label>
                            Disambiguation:
                            <select value={this.state.chosenId} onChange={this.handleRelationsChange}>
                                {
                                    this.state.searchJsons.map((x) =>
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
                <div>
                    {
                        !_.isEmpty(this.state.relationsJson)
                        ? <FamilyTree data={this.state.relationsJson} />
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

    handleSearchChange(event) {
        this.setState({initialName: event.target.value});
    }

    handleRelationsChange(event) {
        this.setState({chosenId: event.target.value});
    }

    async handleSearchSubmit(event) {
        event.preventDefault();
        await this.requests.search(this.state.initialName).then(r => {
            this.setState({
                searchJsons: r,
                chosenId: r[0].id,
                relationsJson: {},
            });
        });

    }

    async handleRelationsSubmit(event) {
        event.preventDefault();
        await this.requests.relations({id: this.state.chosenId}).then(r => {
            this.setState({
                relationsJson: r,
            });
        });
    }

}



export default App;
