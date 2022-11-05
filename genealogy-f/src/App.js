import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React, {Component} from "react";
import './App.css';
import './components/shared.css';
import {NameSearch} from './components/name-search/NameSearch.js'

import { GenogramTree } from "./GenogramTree";
import ClipLoader from 'react-spinners/ClipLoader';
import {CustomUpload} from "./components/custom-upload/CustomUpload";

import {ResultPage} from "./components/result-page/ResultPage.js"
import {exportComponentAsPNG} from 'react-component-export-image';
import {unmountComponentAtNode, findDOMNode} from 'react-dom';
import * as util from 'util';


// COMMENT THIS IN FOR FULL FLOW TEST
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
        };
        this.initialState = JSON.parse(JSON.stringify(this.state));
        this.requests = new Requests();
        // this.genogramTree = React.createRef();

        this.handleChangeInitialName = this.handleChangeInitialName.bind(this);
        this.handleChangeChosenId = this.handleChangeChosenId.bind(this);
        this.handleChangeFrom = this.handleChangeFrom.bind(this);
        this.handleChangeTo = this.handleChangeTo.bind(this);
        this.handleChangeFamily = this.handleChangeFamily.bind(this);


        this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
        this.handleDisambiguationClick = this.handleDisambiguationClick.bind(this);
        this.handleCustomUpload = this.handleCustomUpload.bind(this);
        this.setRelationCalc = this.setRelationCalc.bind(this);
        this.handleHomeButtonClick = this.handleHomeButtonClick.bind(this);
        this.fetchRelations = this.fetchRelations.bind(this);
        this.handlePopupNew = this.handlePopupNew.bind(this);
        this.handlePopupExtend = this.handlePopupExtend.bind(this);
        this.hideTree = this.hideTree.bind(this);
        this.unhideTree = this.unhideTree.bind(this);
        this.fetchRelationsAndRender = this.fetchRelationsAndRender.bind(this);
    }

    render() {
        return (
            <div className='App'>
                <button onClick={this.handleHomeButtonClick} className='home-button blue-button'>
                    Home
                </button>
                {
                    _.isEmpty(this.state.searchJsons) &&
                    !this.state.showTree &&
                        <NameSearch
                            onChange={this.handleChangeInitialName}
                            onClick={this.handleSearchSubmit}
                        />
                }
                {
                    (
                        !_.isEmpty(this.state.searchJsons) ||
                        !_.isEmpty(this.state.relationsJson)
                    ) &&
                    !this.state.showTree &&
                         <Sidebar
                            name={this.state.initialName}
                            nameChange={this.handleChangeInitialName}
                            yearFromChange={this.handleChangeFrom}
                            yearToChange={this.handleChangeTo}
                            familyChange={this.handleChangeFamily}
                            onClick={this.handleSearchSubmit}
                        />
                }
                <div className='tree-box'>
                    {
                        this.state.showTree &&
                            <GenogramTree
                                rawJson={this.state.relationsJson}
                                from={this.state.fromYear}
                                to={this.state.toYear}
                                familyName={this.state.familyName}
                                homeClick={this.handleHomeButtonClick}
                                editCount={this.state.editCount}
                                onPopupNew={this.handlePopupNew}
                                onPopupExtend={this.handlePopupExtend}
                            />
                            // <Adapter data={this.state.relationsJson} />
                    }
                </div>
                {
                    !_.isEmpty(this.state.searchJsons) &&
                    _.isEmpty(this.state.relationsJson) &&
                    !this.state.isLoading &&
                    !this.state.showTree &&
                            <ResultPage
                                    state={this.state}
                                    onChange={this.handleChangeChosenId}
                                    onSubmit={this.handleDisambiguationClick}
                            />
                }
                {
                    this.state.isLoading
                        && <ClipLoader
                            className="loading"
                            color='#0000ff'
                            cssOverride={{
                                display: 'block',
                                margin: '0 auto',
                            }}
                            size={75}
                        />
                }
                {
                    _.isEmpty(this.state.relationsJson) &&
                    !this.state.isLoading &&
                    <CustomUpload onSubmit={this.handleCustomUpload} />
                }
            </div>
        );
    }

    setStatePromise = util.promisify(this.setState);

    handleChangeInitialName(event) {
        this.setState({initialName: event.target.value});
    }

    handleChangeChosenId(id) {
        this.setState({chosenId: id});
    }

    handleChangeFrom(event) {
        const val = event.target.value;
        this.setState((previous) => ({fromYear: val, editCount: previous.editCount + 1}));
    }

    handleChangeTo(event) {
        const val = event.target.value;
        this.setState((previous) => ({toYear: val, editCount: previous.editCount + 1}));
    }

    handleChangeFamily(event) {
        const val = event.target.value;
        this.setState((previous) => ({familyName: val, editCount: previous.editCount + 1}));
    }

    async handleSearchSubmit(event) {
        if (this.state.initialName === '') {
            alert("Please enter a name!");
            return;
        }
        event.preventDefault();
        this.setState({
            isLoading: true,
        });
        if (Object.keys(this.state.relationsJson).length !== 0) {
            console.log("Handle Filter: "+ Object.values(this.state.relationsJson));
            let from = this.state.fromYear;
            let to = this.state.toYear;
            let familyName = this.state.familyName;
            this.setState({
                fromYear: from,
                toYear: to,
                familyName: familyName
            });
            return;
        }
        await this.requests.search(this.state.initialName).then(r => {
            let from = this.state.fromYear;
            let to = this.state.toYear;
            let familyName = this.state.familyName;

            if (Object.values(r).length === 0) {
                alert("Person not found!");
                this.setState({
                    relationsJson: {},
                    isLoading: false,
                });
                return;
            }

            r = Object.values(r).filter(function (v) {
                let birth = v.dateOfBirth;
                if (birth === null || birth === undefined) return true;
                if (from !== '' && to !== '') {
                    return (parseInt(birth.substring(0, 4)) >= parseInt(from) && parseInt(birth.substring(0, 4)) <= parseInt(to))
                } else if (from !== '') {
                    return parseInt(birth.substring(0, 4)) >= parseInt(from);
                } else if (to !== '') {
                    return parseInt(birth.substring(0, 4)) <= parseInt(to);
                }
                return true;
            });
            // console.log(JSON.stringify(r));
            this.setState({
                searchJsons: r,
                chosenId: r[0].id,
                fromYear : from,
                toYear: to,
                familyName: familyName,
                relationsJson: {},
                isLoading: false,
            });
        });
    }

    async handleCustomUpload(data) {
        const chosenId = data.targets[0].id;
        await this.hideTree();
        await this.setRelationCalc(chosenId, data);
        await this.unhideTree();
    }

    async handlePopupNew(id) {
        await this.fetchRelationsAndRender(id);
    }

    async handlePopupExtend(id) {
        console.assert(!_.isEmpty(this.state.relationsJson));
        const oldRelationsJson = structuredClone(this.state.relationsJson);
        await this.hideTree();
        await this.fetchRelations(id);
        const newRelationsJson = this.state.relationsJson;
        const mergedRelationsJson = this.mergeRelations(oldRelationsJson, newRelationsJson);
        await this.setRelationCalc(id, mergedRelationsJson);
        await this.unhideTree();
    }

    async handleDisambiguationClick(event) {
        if (this.state.chosenId === '') {
            alert("Haven't selected a person!");
            return;
        }
        event.preventDefault();
        await this.fetchRelationsAndRender(this.state.chosenId);
    }

    mergeRelations(oldRel, newRel) {
        const res = {};
        res.targets = oldRel.targets;
        const idItemMap = new Map();
        for (const item of oldRel.items) {
            idItemMap.set(item.id, item);
        }
        const idRelMap = new Map();
        for (const rel of oldRel.relations) {
            idRelMap.set(`${rel.item1Id} ${rel.item2Id}`, rel);
        }
        for (const item of newRel.items) {
            if (!idItemMap.has(item.id)) {
                idItemMap.set(item.id, item);
            }
        }
        for (const rel of newRel.relations) {
            const key = `${rel.item1Id} ${rel.item2Id}`;
            if (!idRelMap.has(key)) {
                idRelMap.set(key, rel);
            }
        }
        res.items = Array.from(idItemMap.values());
        res.relations = Array.from(idRelMap.values());
        return res;
    }

    async fetchRelationsAndRender(id) {
        await this.hideTree();
        await this.fetchRelations(id);
        await this.unhideTree();
    }

    async hideTree() {
        await this.setStatePromise({showTree: false});
    }

    async unhideTree() {
        await this.setStatePromise({showTree: true});
    }

    async fetchRelations(id) {
        await this.setStatePromise({
            isLoading: true,
            chosenId: id,
        });
        const relations = await this.requests.relations({id: id});
        if (Object.values(relations)[1].length === 0) {
            this.setStatePromise({
                relationsJson: {},
            });
            alert("No relationship found!")
            return;
        }
        await this.setRelationCalc(
            id,
            relations,
        );
    }

    async setRelationCalc(id, relationsJson) {
        const kinshipJson = await this.requests.relationCalc(
            {start: id, relations: relationsJson.relations});
        const newRelationsJson = this.integrateKinshipIntoRelationsJson(kinshipJson, relationsJson);
        await this.setStatePromise({
            kinshipJson: kinshipJson,
            relationsJson: newRelationsJson,
            isLoading: false,
        });
    }

    integrateKinshipIntoRelationsJson(kinshipJson, relationsJson) {
        const idItemMap = new Map();
        for (const item of relationsJson.items) {
            idItemMap.set(item.id, item);
        }
        for (const key of Object.keys(kinshipJson)) {
            const kinshipStr = kinshipJson[key].map((arr) => {
                arr.reverse();
                return arr.join(' of the ');
            }).join('; ');
            const property = {
                propertyId: 'WD-kinship',
                name: 'relation to the searched person',
                value: kinshipStr,
                valueHash: null,
            };
            console.assert(idItemMap.has(key));
            const item = idItemMap.get(key);
            const props = item.additionalProperties;
            props.push(property);
            item.additionalProperties = props;
            idItemMap.set(key, item);
        }
        const newItems = Array.from(idItemMap.values());
        const res = relationsJson;
        res.items = newItems;
        return res;
    }

    handleHomeButtonClick() {
        this.setState(this.initialState);
    }
}

export default App;
