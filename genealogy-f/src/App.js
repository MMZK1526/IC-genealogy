import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
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
            kinshipJson: {},
            fromYear: '',
            toYear: '',
            familyName: '',
            transformedArr: [],
            isLoading: false,
            editCount: 0,
            showTree: false,
            extendId: '',
            isBeingExtended: false,
            allowExtend: true,
        };
        this.initialState = JSON.parse(JSON.stringify(this.state));
        this.requests = new Requests();

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

        // return (
        //     <div className='App'>
        //             {
        //                 _.isEmpty(this.state.searchJsons) &&
        //                 !this.state.showTree &&
        //                 <NameSearch
        //                     onChange={this.handleChangeInitialName}
        //                     onClick={this.handleSearchSubmit}
        //                 />
        //             }
        //             {
        //                 this.state.showTree &&
        //                 <Sidebar
        //                     name={this.state.initialName}
        //                     nameChange={this.handleChangeInitialName}
        //                     yearFromChange={this.handleChangeFrom}
        //                     yearToChange={this.handleChangeTo}
        //                     familyChange={this.handleChangeFamily}
        //                     onClick={this.handleSearchSubmit}
        //                 />
        //             }
        //         <div className='tree-box'>
        //             {
        //                 this.state.showTree &&
        //                     <GenogramTree
        //                         rawJson={this.state.relationsJson}
        //                         from={this.state.fromYear}
        //                         to={this.state.toYear}
        //                         familyName={this.state.familyName}
        //                         homeClick={this.handleHomeButtonClick}
        //                         editCount={this.state.editCount}
        //                         onPopupNew={this.handlePopupNew}
        //                         onPopupExtend={this.handlePopupExtend}
        //                         personInfo={this.state.extendId}
        //                         allowExtend={this.state.allowExtend}
        //                     />
        //                     // <Adapter data={this.state.relationsJson} />
        //             }
        //         </div>
        //             {
        //                 !_.isEmpty(this.state.searchJsons) &&
        //                 _.isEmpty(this.state.relationsJson) &&
        //                 !this.state.isLoading &&
        //                 !this.state.showTree &&
        //                 <div>
        //                     <div className="toolbar">
        //                         <button onClick={this.handleHomeButtonClick} className='blue-button'>
        //                             <BiHomeAlt size={30}/>
        //                         </button>
        //                     </div>
        //                     <ResultPage
        //                         state={this.state}
        //                         onChange={this.handleChangeChosenId}
        //                         onSubmit={this.handleDisambiguationClick}
        //                     />
        //                 </div>
        //             }
        //             {
        //                 (this.state.isLoading ||
        //                     this.state.isBeingExtended) &&
        //                 <ClipLoader
        //                     className={
        //                         this.state.isBeingExtended ?
        //                             'top-spinner' :
        //                             'loading'
        //                     }
        //                     color='#0000ff'
        //                     cssOverride={{
        //                         display: 'block',
        //                         margin: '0 auto',
        //                     }}
        //                     size={75}
        //                 />
        //             }
        //             {
        //                 _.isEmpty(this.state.relationsJson) &&
        //                 !this.state.isLoading &&
        //                 <CustomUpload onSubmit={this.handleCustomUpload}/>
        //             }
        //     </div>
        // );
    }

    setStatePromise = util.promisify(this.setState);

    // TODO: move to [alternative place]
    async handleCustomUpload(data) {
        const chosenId = data.targets[0].id;
        await this.hideTree();
        await this.setRelationCalc(chosenId, data);
        await this.unhideTree();
    }

    // TODO: move to GenogramTree
    async handlePopupNew(id) {
        await this.fetchRelationsAndRender(id);
    }
}

export default App;
