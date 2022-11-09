import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './components/requests';
import {Home} from './Home';
import './App.css';
import './components/shared.css';
import {NameSearch} from './components/name-search/NameSearch.js';

import GenogramTree from "./GenogramTree";
import ClipLoader from 'react-spinners/ClipLoader';
import {CustomUpload} from "./components/custom-upload/CustomUpload";

import ResultPage from "./components/result-page/ResultPage.js";
import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
  } from "react-router-dom";
import * as util from 'util';

import {BiHomeAlt} from "react-icons/bi"

class App extends React.Component {
    componentDidMount(){
        document.title = "Ancesta - Genealogy Project"
    }
    
    constructor(props) {
        super(props);
        this.state = {
            chosenId: '',
        };
        this.initialState = JSON.parse(JSON.stringify(this.state));
        this.requests = new Requests();

        // TODO: relocate
        this.handleCustomUpload = this.handleCustomUpload.bind(this);
        this.handlePopupNew = this.handlePopupNew.bind(this);
    }

    render() {
        return (
            <div className="App">
              <Router>
                <div className="container">
                <Routes>
                    <Route path="/" element={<Home requests={this.requests}/>} />
                    <Route path="/result" element={<ResultPage requests={this.requests}/>} />
                    <Route path="/tree" element={<GenogramTree requests={this.requests} onPopupExtend={this.handlePopupExtend}/>} />
                </Routes>
                </div>
              </Router>
            </div>
          );
    }

    setStatePromise = util.promisify(this.setState);

    // TODO: relocate to [appropriate place]
    async handleCustomUpload(data) {
        const chosenId = data.targets[0].id;
        await this.hideTree();
        await this.setRelationCalc(chosenId, data);
        await this.unhideTree();
    }

    // TODO: relocate to GenogramTree
    async handlePopupNew(id) {
        await this.fetchRelationsAndRender(id);
    }
}

export default App;
