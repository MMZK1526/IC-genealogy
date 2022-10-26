import {FamilyTree} from "./components/family-tree/FamilyTree";
import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React from "react";
import * as go from 'gojs';
import {ReactDiagram} from 'gojs-react';
import './App.css';
import {Topbar} from './components/topbar/Topbar.js'
import { GenogramTree } from "./GenogramTree";
import {Adapter} from './components/visualisation-adapter/Adapter';


// COMMENT THIS BACK IN FOR QUICK TESTING
function App() {
  return (
      <NameForm />
  );
}

// COMMENT THIS IN FOR FULL FLOW TEST
// class App extends React.Component {
//     componentDidMount(){
//         document.title = "Ancesta - Genealogy Project"
//     }

//     render() {
//         return (
//             <NameForm />
//         );
//     }
// }

class NameForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            initialName: '',
            searchJsons: [],
            chosenId: '',
            relationsJson: {},
            fromYear: '',
            toYear: '',
            transformedArr: [],
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
                <div className='tree-box'>
                    {
                        !_.isEmpty(this.state.relationsJson)
                        ? <Adapter data={this.state.relationsJson} />
                    
                        : null
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
                    return (birth == null) || parseInt(birth.substring(0,4)) >= parseInt(from);
                } else if (to !== '') {
                    return (birth == null) || parseInt(birth.substring(0,4)) <= parseInt(to);
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
            console.log(r);
            this.setState({
                relationsJson: r,
                // transformedArr: transform(r),
            });
        });
    }

}

export default App;
