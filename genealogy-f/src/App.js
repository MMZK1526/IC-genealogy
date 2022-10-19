import './App.css';
import {FamilyTree} from "./components/family-tree/FamilyTree";
import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React from "react";

import {Topbar} from './components/topbar/Topbar.js'

class App extends React.Component {
    componentDidMount(){
        document.title = "Ancesta - Genealogy Project"
    }

    render() {
        return (
            <NameForm />
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
                {/* <div>
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
                </div> */}
                <div className='tree-box'>
                    {
                        !_.isEmpty(this.state.relationsJson)
                        ? <FamilyTree
                            data={this.state.relationsJson}
                            showChildren={true}
                        />
                        : <div id='welcome'>
                            <div id='title'>Ancesta - Genealogy Project</div>
                            <div id='desc'>Search a name to start</div>
                        </div>
                    }
                </div>
                {
                    !_.isEmpty(this.state.searchJsons) && _.isEmpty(this.state.relationsJson)
                    ? <Topbar
                        state={this.state}
                        onChange={this.handleChangeChosenId}
                        onSubmit={this.handleRelationsSubmit}
                    />
                    : ''
                }
                
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
        if (this.state.initialName === '') {
            alert("Please enter a name!");
            return;
        }
        event.preventDefault();
        await this.requests.search(this.state.initialName).then(r => {
            var from = this.state.fromYear;
            var to = this.state.toYear;

            r = Object.values(r).filter(function (v) {
                var birth = v.dateOfBirth
                if (birth == null) return true;
                if (from !== '' && to !== '') {
                    return (birth == null) || (parseInt(birth.substring(0,4)) >= parseInt(from) && parseInt(birth.substring(0,4)) <= parseInt(to))
                } else if (from !== '') {
                    return parseInt(birth.substring(0,4)) >= parseInt(from);
                } else if (to !== '') {
                    return parseInt(birth.substring(0,4)) <= parseInt(to);
                }
                return true;   
            });
            
            this.setState({
                searchJsons: r,
                chosenId: r[0].id,
                relationsJson: {},
            });
        });

    }

    handleRelationsSubmit(event) {
        if (this.state.chosenId === '') {
            alert("Haven't selected a person!");
            return;
        }
        event.preventDefault();
        this.requests.relations({id: this.state.chosenId}).then(r => {
            if (Object.values(r)[1].length === 0) {
                this.setState({
                    relationsJson: {},
                });
                alert("No relationship found!")
                return;
            }
            this.setState({
                relationsJson: r,
            });
        });
    }

}

export default App;
