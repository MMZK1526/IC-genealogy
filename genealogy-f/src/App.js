import './App.css';
// import './FamilyTree.css';
import {FamilyTree} from "./FamilyTree";
import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React from "react";

class App extends React.Component {
    render() {
        return (
            <div className='App'>
                <NameForm />
                {/* <Sidebar /> */}
            </div>
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
            fromYear: '',
            toYear: ''
        };
        this.requests = new Requests();

        this.handleChangeInitialName = this.handleChangeInitialName.bind(this);
        this.handleChangeChosenId = this.handleChangeChosenId.bind(this);
        this.handleChangeFrom = this.handleChangeFrom.bind(this);
        this.handleChangeTo = this.handleChangeTo.bind(this);

        this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
        this.handleRelationsSubmit = this.handleRelationsSubmit.bind(this);
    }

    handleChangeInitialName(event) {
        this.setState({initialName: event.target.value});
    }

    handleChangeChosenId(event) {
        this.setState({chosenId: event.target.value});
    }

    handleChangeFrom(event) {
        this.setState({fromYear: event.target.value});
    }

    handleChangeTo(event) {
        this.setState({toYear: event.target.value});
    }

    render() {
        return (
            <div className='App'>
                <Sidebar
                    nameChange={this.handleChangeInitialName}
                    yearFromChange={this.handleChangeFrom}
                    yearToChange={this.handleChangeTo}
                    onClick={this.handleSearchSubmit}
                />
                {this.state.searchJsons
                    ? <form onSubmit={this.handleRelationsSubmit}>
                        <label>
                            Disambiguation:
                            <select value={this.state.chosenId} onChange={this.handleChangeChosenId}>
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
                        : ''
                    }
                </div>
                <div>
                    {
                        !_.isEmpty(this.state.relationsJson)
                        ? <FamilyTree data={this.state.relationsJson} showChildren={false} />
                            : ''
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

    async handleSearchSubmit(event) {
        event.preventDefault();
        await this.requests.search(this.state.initialName).then(r => {
            var from = this.state.fromYear
            var to = this.state.toYear
            console.log(typeof(from))
            if (from !== '' && to !== '') {
                r = Object.values(r).filter(function (v) {
                    return parseInt(v.dateOfBirth.substring(0,4)) >= parseInt(from) && parseInt(v.dateOfBirth.substring(0,4)) <= parseInt(to)
                });
            } else if (from !== '') {
                r = Object.values(r).filter(function (v) {
                    return parseInt(v.dateOfBirth.substring(0,4)) >= parseInt(from)});
            } else if (to !== '') {
                r = Object.values(r).filter(function (v) {
                    return parseInt(v.dateOfBirth.substring(0,4)) <= parseInt(to)});
            }
            
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
