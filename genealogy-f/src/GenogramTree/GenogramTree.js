import { Sidebar } from '../components/Sidebar.js';
import Container from 'react-bootstrap/Container';
import React from 'react';
import * as go from 'gojs';
import '../stylesheets/App.css';
import PopupInfo from '../components/PopupInfo.js'
import '../stylesheets/GenogramTree.css';
import { StatsPanel } from '../components/StatsPanel';
import EscapeCloseable from '../components/EscapeCloseable';
import '../components/stylesheets/shared.css';
import _ from 'lodash';
import { setStatePromise } from '../components/utils';
import ModalSpinner from '../ModalSpinner';
import Toolbar from '../Toolbar';
import { FilterModel } from '../filterModel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { DiagramWrapper } from "./DiagramWrapper";
import { getPersonMap, transform, withRouter, ndb } from "./utilFunctions";
import { TreeNameLookup } from '../components/TreeNameLookup.js';
import { AiOutlineConsoleSql } from 'react-icons/ai';

const ENABLE_PRE_FETCHING = false;

// optional parameter passed to <ReactDiagram onModelChange = {handleModelChange}>
// called whenever model is changed

// class encapsulating the tree initialisation and rendering
class GenogramTree extends React.Component {

    constructor(props) {
        super(props);
        this.treeCache = {};
        this.wikiTreeCache = {};
        this.extensionId = null;
        let rawJSON = null;
        this.source = props.router.location.state ? props.router.location.state.source : null;
        if (this.source) {
            rawJSON = props.router.location.state.relations;
            this.handleModelChange = this.handleModelChange.bind(this);
            this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
            this.closePopUp = this.closePopUp.bind(this);
            this.handleStatsClick = this.handleStatsClick.bind(this);
            this.handlePopupExtend = this.handlePopupExtend.bind(this);
            this.getPersonsRelations = this.getPersonsRelations.bind(this);
            this.getPersonMap = this.getPersonMap.bind(this);
            this.setFocusPerson = this.setFocusPerson.bind(this);
            this.getFocusPerson = this.getFocusPerson.bind(this);
            this.requests = this.props.requests;
            this.isLoading = !rawJSON;
            this.state = {
                root: this.source,
                isUpdated: !this.isLoading,
                isLoading: this.isLoading,
                originalJSON: rawJSON,
                relationJSON: rawJSON,
                kinshipJSON: null,
                personInfo: null,
                isPopped: false,
                showStats: false,
                filters: new FilterModel(true),
                showBtns: true,
                recentre: false,
                recommit: false,
                newDataAvailable: false,
                newData: null,
                zoomToDefault: false,
                showLookup: false,
                showFilters: false
            };
            this.componentRef = React.createRef();
        }
    }

    // render() {
    //     if (this.source == null) {
    //         alert('Invalid URL!');
    //         return <p>Invalid URL!</p>
    //     }

    //     if (this.state.relationJSON == null) {
    //         this.fetchFromCacheOrBackend(this.source, 2);

    //         return (
    //             <>
    //                 <Toolbar onlyHome={true}/>
    //                 <Container style={{height: "100vh"}} className="d-flex justify-content-center">
    //                     <ModalSpinner/>
    //                 </Container>
    //             </>
    //         );
    //     }

    //     var updateDiagram = false;
    //     if (this.state.isUpdated) {
    //         this.state.isUpdated = false;
    //         this.applyFilterAndDrawTree();
    //         this.relations = transform(this.state.relationJSON);
    //         updateDiagram = true;
    //         this.state.isLoading = false;
    //     }
    //     var recentre = false;
    //     if (this.state.recentre) {
    //         recentre = true;
    //         this.state.recentre = false;
    //     }
    //     this.personMap = getPersonMap(Object.values(this.state.originalJSON.items));

    //     return (
    //         <>
    //             <Container fluid className="pe-none p-0 h-100 justify-content-between" style={{
    //                 position: "fixed",
    //                 zIndex: 1
    //             }}>
    //                 <Row>
    //                     {this.state.showBtns &&
    //                         <Toolbar genogramTree={this}/>
    //                     }
    //                 </Row>
    //                 <Row className="me-4 mh-50 justify-content-end">
    //                     <Col xs="4">
    //                         {this.state.showFilters &&
    //                             <Sidebar
    //                                 filters={this.state.filters}
    //                                 yearFromChange={e => {
    //                                     this.setState({
    //                                         from: e.target.value,
    //                                         isUpdated: true
    //                                     });
    //                                 }}
    //                                 yearToChange={e => {
    //                                     this.setState({
    //                                         to: e.target.value,
    //                                         isUpdated: true
    //                                     });
    //                                 }}
    //                                 familyChange={e => {
    //                                     this.setState({
    //                                         family: e.target.value,
    //                                         isUpdated: true
    //                                     });
    //                                 }}
    //                                 onChange={() => this.setState({isUpdated: true, isLoading: true})}
    //                                 onPrune={() => {
    //                                     this.state.originalJSON.relations = JSON.parse(JSON.stringify(this.state.relationJSON.relations));
    //                                     for (const key of Object.keys(this.state.originalJSON.items)) {
    //                                         if (!this.state.relationJSON.items[key] && key !== this.state.root) {
    //                                             delete this.state.originalJSON.items[key];
    //                                         }
    //                                     }
    //                                     this.calculateFilter();
    //                                     this.setState({isUpdated: true, isLoading: true});
    //                                 }}
    //                                 onPersonSelection={(_, v) => this.setFocusPerson(v.key)}
    //                                 getPersonsRelations={this.getPersonsRelations}
    //                                 getFocusPerson={this.getFocusPerson}
    //                             />
    //                         }
    //                     </Col>
    //                 </Row>
    //                 <Row>
    //                     <Col xs="2">
    //                         {this.state.isLoading &&
    //                             <div className='pe-auto'>
    //                                 <ModalSpinner/>
    //                             </div>
    //                         }
    //                     </Col>
    //                 </Row>
    //             </Container>
    //             {
    //                 this.state.isPopped
    //                     ? <div className='popup'>
    //                         <PopupInfo
    //                             closePopUp={this.closePopUp}
    //                             info={this.personMap.get(this.state.personInfo)}
    //                             onNew={() => {
    //                                 this.state.root = this.state.personInfo;
    //                                 this.fetchKinships(this.state.root, this.state.originalJSON);
    //                             }}
    //                             // onExtend={() => null}
    //                             onExtend={this.handlePopupExtend}
    //                             allowExtend={this.props.allowExtend}
    //                         >
    //                         </PopupInfo>
    //                     </div>
    //                     : ''
    //             }
    //             <div className='tree-box'>
    //                 <DiagramWrapper
    //                     updateDiagram={updateDiagram}
    //                     recentre={recentre}
    //                     editCount={this.props.editCount}
    //                     nodeDataArray={this.relations}
    //                     onModelChange={this.handleModelChange}
    //                     onDiagramEvent={this.handleDiagramEvent}
    //                     yearFrom={this.props.from}
    //                     yearTo={this.props.to}
    //                     ref={this.componentRef}
    //                     root={this.state.root}
    //                     getFocusPerson={this.getFocusPerson}
    //                     zoomToDefault={this.state.zoomToDefault}
    //                 />

    //             </div>

    //             {
    //                 this.state.showStats &&
    //                 <EscapeCloseable className='popup'>
    //                     <StatsPanel data={this.state.relationJSON} onClick={this.handleStatsClick}/>
    //                 </EscapeCloseable>
    //             }

    //         </>
    //     );
    // }

    // Returns all persons nodes in tree
    getPersonsRelations() {
        return this.relations.filter((person) => {
            return person.name !== 'unknown' && person.gender !== "LinkLabel";
        });
    }

    setFocusPerson(focusId) {
        this.setState({
            personInfo: focusId,
            recentre: true,
        });
    }

    getFocusPerson() {
        return this.state.personInfo;
    }

    getPersonMap() {
        return this.personMap;
    }

    closePopUp() {
        this.setState({
            isPopped: false
        })
    }

    handleModelChange(changes) {
        console.log('GoJS model changed!');
    }

    handleDiagramEvent(event) {
        console.log(this.personMap);
        if (!this.personMap.has(event.subject.part.key)) {
            return;
        }
        this.setState({
            personInfo: event.subject.part.key,
            isPopped: true
        })
    }

    handleStatsClick() {
        this.setState((state) => ({
            showStats: !state.showStats,
        }));
    }
    integrateKinshipIntoRelationJSON(kinshipJson, relationJSON) {
        for (const key of Object.keys(kinshipJson)) {
            const kinshipStr = kinshipJson[key].map((arr) => {
                arr.reverse();
                return arr.join(' of the ');
            }).join('; ');

            // console.assert(relationJSON.items[key]);
            if (!relationJSON.items[key]) {
                continue;
            }
            const item = relationJSON.items[key];
            const props = item.additionalProperties;
            const prop = props.find((p) => p.propertyId == 'PB-kinship');
            if (prop) {
                prop.value = kinshipStr;
            } else {
                const property = {
                    propertyId: 'PB-kinship',
                    name: 'relation to the searched person',
                    value: kinshipStr,
                    valueHash: null,
                };
                props.push(property);
            }
            item.additionalProperties = props;
            relationJSON.items[key] = item;
        }

        return relationJSON;
    }

    // If id is provided, we search this id. Otherwise, it is a JSON provided by the user

    fetchRelations = async ({ id = null, depth = null, customUpload = false } = {}) => {
        if (id === null) {
            this.loadCustomData();
            return;
        }
        const [dbPromise, wikiDataPromise] = this.requests.relationsCacheAndWiki({
            id: id, depth: depth,
            visitedItems: this.state.originalJSON ? Object.keys(this.state.originalJSON.items) : []
        });
        const dbRes = await dbPromise;
        if (this.requests.dbResEmpty(dbRes)) {
            const wikiDataRes = await wikiDataPromise;
            this.loadRelations(wikiDataRes, id);
            return;
        }
        this.loadRelations(dbRes, id);
        const wikiDataRes = await wikiDataPromise;
        if (this.containsMoreData(wikiDataRes, dbRes)) {
            this.setState({
                newDataAvailable: true,
                newData: wikiDataRes,
            });
        }
    }

    containsMoreData = (tree, other) => {
        const counts = this.countTree(tree);
        const otherCounts = this.countTree(other);
        let result = counts[0] > otherCounts[0] && counts[1] > otherCounts[1];
        return result;
    }

    countTree = (tree) => {
        return [
            this.countItems(tree),
            this.countRelations(tree),
        ];
    }

    countItems = (relationsJSON) => {
        const obj = relationsJSON.items;
        const individuals = Object.keys(obj);
        const result = individuals.length;
        return result;
    }

    countRelations = (relationsJSON) => {
        const obj = relationsJSON.relations;
        const individuals = Object.values(obj).flat();
        const result = individuals.length;
        return result;
    }

    loadCustomData = async () => {
        this.loadRelations(this.state.originalJSON, null);
    }

    loadRelations = (relationJSON, id) => {
        console.log("Loading relations!");
        // Add reciprocal relations.
        for (const [key, relations] of Object.entries(relationJSON.relations)) {
            for (const relation of relations) {
                if (relation.type === 'spouse') {
                    if (!relationJSON.relations[relation.item1Id]) {
                        relationJSON.relations[relation.item1Id] = [{
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'spouse',
                            typeId: 'WD-P26'
                        }];
                    } else if (!relationJSON.relations[relation.item1Id].some((r) => r.type === 'spouse' && r.item1Id === key)) {
                        relationJSON.relations[relation.item1Id].push({
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'spouse',
                            typeId: 'WD-P26'
                        });
                    }
                } else if (relation.type === 'father' || relation.type === 'mother') {
                    if (!relationJSON.relations[relation.item1Id]) {
                        relationJSON.relations[relation.item1Id] = [{
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'child',
                            typeId: 'WD-P40'
                        }];
                    } else if (!relationJSON.relations[relation.item1Id].some((r) => (r.type === 'child') && r.item1Id === key)) {
                        relationJSON.relations[relation.item1Id].push({
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'child',
                            typeId: 'WD-P40'
                        });
                    }
                } else if (relation.type === 'child') {
                    let gender = null;
                    for (let attr of relationJSON.items[key].additionalProperties) {
                        if (attr.name === 'gender') {
                            gender = attr.value;
                            break;
                        }
                    }

                    if (!relationJSON.relations[relation.item1Id]) {
                        if (gender === 'male') {
                            relationJSON.relations[relation.item1Id] = [{
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'father',
                                typeId: 'WD-P22'
                            }];
                        } else if (gender === 'female') {
                            relationJSON.relations[relation.item1Id] = [{
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'mother',
                                typeId: 'WD-P25'
                            }];
                        }
                    } else if (!relationJSON.relations[relation.item1Id].some((r) => (r.type === 'father' || r.type === 'mother') && r.item1Id === key)) {
                        if (gender === 'male') {
                            relationJSON.relations[relation.item1Id].push({
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'father',
                                typeId: 'WD-P22'
                            });
                        } else if (gender === 'female') {
                            relationJSON.relations[relation.item1Id].push({
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'mother',
                                typeId: 'WD-P25'
                            });
                        }
                    }
                }
            }
        }

        if (this.state.originalJSON == null) {
            this.state.originalJSON = relationJSON;
        } else {
            this.mergeRelations(this.state.originalJSON, relationJSON);
        }
        this.fetchKinships(this.state.root, this.state.originalJSON);
        this.applyFilterAndDrawTree();
        if (id == null || id === undefined) {
            this.state.isLoading = false;
            this.state.isUpdated = true;
            this.state.personInfo = this.state.root;
        } else {
            this.setState({
                isLoading: false,
                isUpdated: true,
                personInfo: id,
            });
        }
    }

    calculateFilter() {
        let textFilterIDs = ['SW-P2', 'SW-P3', 'WD-P53'];
        for (let fid of textFilterIDs) {
            if (this.state.filters.textFilters[fid] === undefined) {
                this.state.filters.textFilters[fid] = {};
                this.state.filters.textFilters[fid].all = new Set();
                this.state.filters.textFilters[fid].choice = new Set();
            }
        }

        // Get filter options
        // let famMap = new Set();
        // let pobMap = new Set();
        // let podMap = new Set();
        // set up id map for getting attributes later
        for (let x of Object.keys(this.state.originalJSON.items)) {
            let people = this.state.originalJSON.items[x];
            for (let fid of textFilterIDs) {
                for (let f of people.additionalProperties.filter((p) => p.propertyId == fid).map((p) => p.value)) {
                    this.state.filters.textFilters[fid].all.add(f);
                }
            }
            // for (let f of people.additionalProperties.filter((p) => p.name == 'family').map((p) => p.value)) {
            //     famMap.add(f);
            // }
            // for (let f of people.additionalProperties.filter((p) => p.propertyId == 'SW-P2').map((p) => p.value)) {
            //     pobMap.add(f);
            // }
            // for (let f of people.additionalProperties.filter((p) => p.propertyId == 'SW-P3').map((p) => p.value)) {
            //     podMap.add(f);
            // }
        }
        // this.state.filters.allFamilies = famMap;
        // this.state.filters.allBirthPlaces = pobMap;
        // this.state.filters.allDeathPlaces = podMap;
    }

    applyFilterAndDrawTree() {
        this.calculateFilter();

        // Use filter
        const filters = this.state.filters;
        var filteredJSON = { targets: this.state.originalJSON.targets };
        var useTextFilter = false;
        for (let key of Object.keys(filters.textFilters)) {
            if (filters.textFilters[key].choice.size > 0) {
                useTextFilter = true;
            }
        }
        if (filters.bloodline || filters.fromYear !== '' || filters.toYear !== '' || useTextFilter) {
            // Map from item ID to opacity
            let visited = {};
            visited[this.state.root] = '0.9';
            if (filters.bloodline) {
                console.log('血胤');
                var frontier = [this.state.root];
                var descendants = [];

                while (frontier.length > 0 || descendants.length > 0) {
                    var cur = frontier.shift();
                    if (cur) {
                        if (this.state.originalJSON.relations[cur]) {
                            var newElems = this.state.originalJSON.relations[cur]
                                .filter((r) => r.type !== 'spouse' && visited[r.item1Id] !== '0.9');
                            var newFrontier = newElems.filter((r) => r.type !== 'child').map((r) => r.item1Id);
                            var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                            newElems.map((r) => r.item1Id).forEach((id) => visited[id] = '0.9');
                            frontier.push(...newFrontier);
                            descendants.push(...newDescendants);
                        }
                    } else {
                        cur = descendants.shift();
                        if (this.state.originalJSON.relations[cur]) {
                            var newElems = this.state.originalJSON.relations[cur]
                                .filter((r) => r.type !== 'spouse' && visited[r.item1Id] !== '0.9');
                            var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                            newDescendants.forEach((id) => visited[id] = '0.9');
                            newElems.filter((r) => !visited[r.item1Id]).map((r) => r.item1Id).forEach((id) => {
                                visited[id] = '0.5';
                            });
                            descendants.push(...newDescendants);
                        }
                    }
                }
            } else {
                Object.keys(this.state.originalJSON.items).forEach((id) => visited[id] = '0.9');
            }

            // filter on text-based filters
            for (let key of Object.keys(filters.textFilters)) {
                if (filters.textFilters[key].choice.size > 0) {
                    for (const [k, _] of Object.entries(visited)) {
                        const criteria = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.propertyId == key)
                            .map((p) => p.value).some((f) => filters.textFilters[key].choice.has(f));
                        if (!criteria) {
                            delete visited[k];
                            continue;
                        }
                    }
                }
            }
            console.log(Array.from(visited));

            // // filter on Family
            // if (filters.families.size !== 0) {
            //     for (const [k, _] of Object.entries(visited)) {
            //         const criteria = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.name == 'family')
            //             .map((p) => p.value).some((f) => filters.families.has(f));
            //         if (!criteria) {
            //             delete visited[k];
            //             continue;
            //         }
            //     }
            // }
            // filter on From birth year
            if (filters.fromYear !== '') {
                for (const [k, _] of Object.entries(visited)) {
                    let dob = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.name == 'date of birth')[0];
                    if (dob === undefined) {
                        delete visited[k];
                        continue;
                    }
                    dob = ndb(dob.value.split('T')[0]);
                    let fromYear = filters.fromYear[0] == "-" ? "-" + (filters.fromYear.substring(1)).padStart(6, '0') : filters.fromYear.padStart(4, '0');
                    if (new Date(dob).getFullYear() < new Date(fromYear).getFullYear()) {
                        delete visited[k];
                        continue;
                    }
                }
            }
            // filter on To birth year
            if (filters.toYear !== '') {
                for (const [k, _] of Object.entries(visited)) {
                    let dob = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.name == 'date of birth')[0];
                    if (dob === undefined) {
                        delete visited[k];
                        continue;
                    }
                    dob = ndb(dob.value.split('T')[0]);
                    let toYear = filters.toYear[0] == "-" ? "-" + (filters.toYear.substring(1)).padStart(6, '0') : filters.toYear.padStart(4, '0');
                    if (new Date(dob).getFullYear() > new Date(toYear).getFullYear()) {
                        delete visited[k];
                        continue;
                    }
                }
            }
            // // filter on Birth Place
            // if (filters.birthPlaces.size !== 0) {
            //     for (const [k, _] of Object.entries(visited)) {
            //         const criteria = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.propertyId == 'SW-P2')
            //             .map((p) => p.value).some((f) => filters.birthPlaces.has(f));
            //         if (!criteria) {
            //             delete visited[k];
            //             continue;
            //         }
            //     }
            // }
            // // filter on To Death Place
            // if (filters.deathPlaces.size !== 0) {
            //     for (const [k, _] of Object.entries(visited)) {
            //         const criteria = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.propertyId == 'SW-P3')
            //             .map((p) => p.value).some((f) => filters.deathPlaces.has(f));
            //         if (!criteria) {
            //             delete visited[k];
            //             continue;
            //         }
            //     }
            // }

            // Add outliers
            let outlierVisited = (new go.Set()).addAll(Object.keys(visited));
            var frontier = (new go.Set()).addAll(Object.keys(visited));
            while (outlierVisited.size > 0 && frontier.size > 0) {
                let outlierParents = new go.Set();
                let outlierSpouses = new go.Set();
                let remover = new go.Set();
                frontier.each((v) => {
                    if (this.state.originalJSON.relations[v]) {
                        var newElems = this.state.originalJSON.relations[v]
                            .filter((r) => (r.type !== 'child') && !visited[r.item1Id]);
                        if (newElems.length === 0) {
                            remover.add(v);
                        } else {
                            outlierParents.addAll(newElems.filter((r) => r.type !== 'spouse').map((r) => r.item1Id));
                            outlierSpouses.addAll(newElems.filter((r) => r.type === 'spouse').map((r) => r.item1Id));
                        }
                    }
                });
                frontier.removeAll(remover);
                outlierVisited = outlierParents.retainAll(outlierSpouses);
                frontier.addAll(outlierVisited);
                outlierVisited.each((ov) => {
                    if (!visited[ov]) {
                        visited[ov] = '0.5';
                    }
                })
            }

            // Filter out hidden people
            this.state.filters.hiddenPeople.forEach((k) => delete visited[k]);

            var filteredJSON = { targets: this.state.originalJSON.targets, items: {}, relations: {} };
            Object.keys(visited).forEach((v) => {
                filteredJSON.items[v] = this.state.originalJSON.items[v];
                filteredJSON.items[v].opacity = visited[v];
                if (this.state.originalJSON.relations[v]) {
                    filteredJSON.relations[v] = this.state.originalJSON.relations[v].filter((r) => visited[r.item1Id]);
                }
            });
            this.state.relationJSON = filteredJSON;
        } else {
            this.state.relationJSON = JSON.parse(JSON.stringify(this.state.originalJSON));
        }
    }

    async fetchKinships(id, relationJSON) {
        const newRelationJSON = await this.injectKinship(id, relationJSON);
        this.setState({
            originalJSON: newRelationJSON
        });
    }

    injectKinship = async (id, relationJSON) => {
        const kinshipJSON = await this.requests.relationCalc({
            start: id,
            relations: Object.values(relationJSON.relations).flat(),
        });
        return this.integrateKinshipIntoRelationJSON(kinshipJSON, relationJSON);
    }

    // Merge two relational JSONs, modifying the old one.
    mergeRelations(oldRel, newRel) {
        oldRel.items = { ...oldRel.items, ...newRel.items };

        const idRelMap = new Map();

        for (const [key, relations] of Object.entries(oldRel.relations)) {
            let curRelations = idRelMap.get(key);
            if (curRelations) {
                relations.forEach((r) => curRelations.add(r));
            } else {
                curRelations = new Set();
                relations.forEach((r) => curRelations.add(r));
                idRelMap.set(key, curRelations);
            }
        }

        for (const [key, relations] of Object.entries(newRel.relations)) {
            let curRelations = idRelMap.get(key);
            if (curRelations) {
                relations.forEach((r) => curRelations.add(r));
            } else {
                curRelations = new Set();
                relations.forEach((r) => curRelations.add(r));
                idRelMap.set(key, curRelations);
            }
        }

        oldRel.relations = {};
        idRelMap.forEach((v, k) => oldRel.relations[k] = Array.from(v));
        return oldRel;
    }

    // Handle tree extension

    async handlePopupExtend() {
        if (this.state.isLoading) {
            alert('Please wait for the current expansion to finish');
            return;
        }
        this.setState({
            isLoading: true,
            isUpdated: false,
        });
        await this.fetchFromCacheOrBackend(this.state.personInfo, 2);
    }

    zoomToDefault = async () => {
        return;
        const foo = setStatePromise(this);
        await foo({
            zoomToDefault: true,
        });
        await foo({
            zoomToDefault: false,
        });
    };

    // renders ReactDiagram

    render() {
        if (this.source == null) {
            alert('Invalid URL!');
            return <p>Invalid URL!</p>
        }

        if (this.state.relationJSON == null) {
            this.fetchFromCacheOrBackend(this.source, 2);

            return (
                <>
                    <Toolbar onlyHome={true} />
                    <Container style={{ height: "100vh" }} className="d-flex justify-content-center">
                        <ModalSpinner />
                    </Container>
                </>
            );
        }
        console.log("got here initial getting person map");
        var updateDiagram = false;
        if (this.state.isUpdated) {
            this.state.isUpdated = false;
            this.applyFilterAndDrawTree();
            this.relations = transform(this.state.relationJSON);
            this.personMap = getPersonMap(Object.values(this.state.originalJSON.items));
            updateDiagram = true;
            this.state.isLoading = false;
        }
        var recentre = false;
        if (this.state.recentre) {
            recentre = true;
            this.state.recentre = false;
        }
        var recommit = false;
        if (this.state.recommit) {
            recommit = true;
            this.state.recommit = false;
        }
        this.personMap = getPersonMap(Object.values(this.state.originalJSON.items));

        return (
            <>
                <Container fluid className="pe-none p-0 h-100 justify-content-between" style={{
                    position: "fixed",
                    zIndex: 1
                }}>
                    <Row>
                        {this.state.showBtns &&
                            <Toolbar genogramTree={this} />
                        }
                    </Row>
                    <Row className="me-4 mh-50 justify-content-end">
                        <Col xs="4">
                            {this.state.showFilters &&
                                <Sidebar
                                    filters={this.state.filters}
                                    yearFromChange={e => {
                                        this.setState({
                                            from: e.target.value,
                                            isUpdated: true
                                        });
                                    }}
                                    yearToChange={e => {
                                        this.setState({
                                            to: e.target.value,
                                            isUpdated: true
                                        });
                                    }}
                                    familyChange={e => {
                                        this.setState({
                                            family: e.target.value,
                                            isUpdated: true
                                        });
                                    }}
                                    onChange={() => this.setState({ isUpdated: true, isLoading: true })}
                                    onPrune={() => {
                                        this.state.originalJSON.relations = JSON.parse(JSON.stringify(this.state.relationJSON.relations));
                                        for (const key of Object.keys(this.state.originalJSON.items)) {
                                            if (!this.state.relationJSON.items[key] && key !== this.state.root) {
                                                delete this.state.originalJSON.items[key];
                                            }
                                        }
                                        this.calculateFilter();
                                        this.setState({ isUpdated: true, isLoading: true });
                                    }}
                                />
                            }
                            {
                                this.state.showLookup &&
                                <TreeNameLookup
                                    onPersonSelection={(_, v) => this.setFocusPerson(v.key)}
                                    getPersonsRelations={this.getPersonsRelations}
                                    getFocusPerson={this.getFocusPerson}
                                    getPersonMap={this.getPersonMap}
                                />
                            }
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="2">
                            {this.state.isLoading &&
                                <div className='pe-auto'>
                                    <ModalSpinner />
                                </div>
                            }
                        </Col>
                    </Row>
                </Container>
                {
                    this.state.isPopped
                        ? <div className='popup'>
                            <PopupInfo
                                closePopUp={this.closePopUp}
                                info={this.personMap.get(this.state.personInfo)}
                                onNew={() => {
                                    this.state.root = this.state.personInfo;
                                    this.fetchKinships(this.state.root, this.state.originalJSON);
                                }}
                                isHidden={this.state.filters.hiddenPeople.has(this.state.personInfo)}
                                onToggle={() => {
                                    let hidden = this.state.filters.hiddenPeople;
                                    if (hidden.has(this.state.personInfo)) {
                                        hidden.delete(this.state.personInfo);
                                    } else {
                                        hidden.add(this.state.personInfo);
                                    }
                                    this.setState({ recommit: true });
                                }}
                                onExtend={this.handlePopupExtend}
                                allowExtend={this.props.allowExtend}
                            >
                            </PopupInfo>
                        </div>
                        : ''
                }
                <div className='tree-box'>
                    <DiagramWrapper
                        updateDiagram={updateDiagram}
                        recentre={recentre}
                        recommit={recommit}
                        editCount={this.props.editCount}
                        nodeDataArray={this.relations}
                        onModelChange={this.handleModelChange}
                        onDiagramEvent={this.handleDiagramEvent}
                        hiddenPeople={this.state.filters.hiddenPeople}
                        ref={this.componentRef}
                        root={this.state.root}
                        getFocusPerson={this.getFocusPerson}
                        zoomToDefault={this.state.zoomToDefault}
                        personMap={this.personMap}
                    />

                </div>

                {
                    this.state.showStats &&
                    <div className='popup'>
                        <EscapeCloseable className='popup'>
                            <StatsPanel data={this.state.relationJSON} onClick={this.handleStatsClick} />
                        </EscapeCloseable>
                    </div>
                }

            </>
        );
    }

    fetchFromCacheOrBackend = async (id, depth) => {
        if (this.state.relationJSON == null || !ENABLE_PRE_FETCHING) {
            this.fetchRelations({ id: id, depth: depth });
        }
        if (!ENABLE_PRE_FETCHING) {
            return;
        }
        if (this.extendInCache(id)) {
            this.extendFromCache(id);
        }
        this.extensionId = id;
        const [dbPromise, wikiDataPromise] = this.requests.relationsCacheAndWiki({
            id: id, depth: 3
            , outlierVisited: this.state.originalJSON ? Object.keys(this.state.originalJSON.items) : []
        });
        const dbRes = await dbPromise;
        if (this.requests.dbResEmpty(dbRes)) {
            const wikiDataRes = await wikiDataPromise;
            this.updateTreeCache(wikiDataRes);
            return;
        }
        this.updateTreeCache(dbRes);
        const wikiDataRes = await wikiDataPromise;
        if (this.containsMoreData(
            this.neighborTree(wikiDataRes, id),
            this.neighborTree(dbRes, id)
        )) {
            this.updateWikiTreeCache(wikiDataRes, id);
        }
    }

    /**
     * Adds additional wiki data to last extended node.
     * Assumes db data is less complete than wiki data.
     * Doesn't modify previous extensions.
     * @param wikiDataRes
     * @param id
     */
    updateWikiTreeCache = (wikiDataRes, id) => {
        this.wikiTreeCache = this.mergeRelations(this.wikiTreeCache, this.treeCache);
        this.wikiTreeCache = this.mergeRelations(this.wikiTreeCache, wikiDataRes);
        const wikiTree = this.getRenderTreeUsingCache(id, this.state.originalJSON, this.wikiTreeCache);
        this.setState({
            newDataAvailable: true,
            newData: wikiTree,
        });
        console.log('Wiki cache has been updated');
    }

    tryExtendFromCache = async () => {
        const id = this.extensionId;
        if (!id || !this.extendInCache(id)) {
            return;
        }
        await this.extendFromCache(id);
    }

    updateTreeCache = async (relations) => {
        if (_.isEmpty(this.treeCache)) {
            this.treeCache = relations;
            console.log('Cache has been updated');
            return;
        }
        const newTree = this.mergeRelations(this.treeCache, relations);
        this.treeCache = await this.injectKinship(this.state.root, newTree);
        await this.tryExtendFromCache();
        console.log('Cache has been updated');
    }
    // initialises tree (in theory should only be called once, diagram should be .clear() and then data updated for re-initialisation)

    // see https://gojs.net/latest/intro/react.html


    // majority of code below is from https://gojs.net/latest/samples/genogram.html

    extendInCache = (id) => {
        const curTree = this.state.relationJSON;
        const cachedTree = this.treeCache;
        if (_.isEmpty(cachedTree)) {
            return false;
        }

        const curNeighbors = curTree.relations[id];
        if (!Object.hasOwn(cachedTree.relations, id)) {
            return false;
        }
        const cachedNeighbors = cachedTree.relations[id];
        return cachedNeighbors.length > curNeighbors.length;
    }

    extendFromCache = async (id) => {
        const curTree = this.state.originalJSON;
        const cachedTree = this.treeCache;
        const kinshipTree = await this.getRenderTreeUsingCache(id, curTree, cachedTree);
        this.extensionId = null;
        this.setState({
            originalJSON: kinshipTree,
            isLoading: false,
            isUpdated: true,
            newDataAvailable: true,
            newData: kinshipTree,
        });
        console.log('Cache was used for rendering');
    }

    getRenderTreeUsingCache = async (extendId, curTree, cachedTree) => {
        const neighborTree = this.neighborTree(cachedTree, extendId);
        const newTree = this.mergeRelations(curTree, neighborTree);
        const kinshipTree = await this.injectKinship(this.state.root, newTree);
        const itemIds = new Set(Object.keys(kinshipTree.items));
        const relationIds = new Set(Object.values(kinshipTree.relations).flat().map(x => x.item1Id));
        const prunedRelations = {};
        for (const [id, arr] of Object.entries(kinshipTree.relations)) {
            if (!itemIds.has(id)) {
                continue;
            }
            prunedRelations[id] = arr.filter(x => itemIds.has(x.item1Id));
        }
        const prunedRelationsIds = new Set(Object.values(prunedRelations).flat().map(x => x.item1Id));
        console.assert(_.isEqual(itemIds, prunedRelationsIds));
        kinshipTree.relations = prunedRelations;
        return kinshipTree;
    }

    neighborTree = (tree, id) => {
        const firstNeighbors = new Set(tree
            .relations[id]
            .map(x => x.item1Id)
        );
        const secondNeighbors = new Set(
            Object.keys(tree.relations)
                .filter(id => firstNeighbors.has(id))
                .map(id => tree.relations[id])
                .flat()
                .map(x => x.item1Id)
        );
        const neighbors = [...firstNeighbors, ...secondNeighbors];
        console.assert(neighbors.length > 0);
        let newItems = {};
        for (const id of neighbors) {
            newItems[id] = tree.items[id];
        }
        let newRelations = {};
        for (const id of Object.keys(newItems)) {
            newRelations[id] = tree.relations[id];
        }
        return {
            items: newItems,
            relations: newRelations,
        };
    }
}

export default withRouter(GenogramTree);
