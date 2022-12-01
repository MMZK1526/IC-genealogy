import { TreeFilter } from '../components/TreeFilter.js';
import Container from 'react-bootstrap/Container';
import React from 'react';
import * as go from 'gojs';
import '../stylesheets/App.css';
import PopupInfo from '../components/PopupInfo.js'
import RelSearchResult from '../components/RelSearchResult.js'
// import PopupTemplate from '../components/PopupTemplate.js';
import '../stylesheets/GenogramTree.css';
import { StatsPanel } from '../components/StatsPanel';
import '../components/stylesheets/shared.css';
import _ from 'lodash';
import { setStatePromise } from '../components/utils';
import ModalSpinner from '../ModalSpinner';
import Toolbar from '../Toolbar';
import { FilterModel } from '../filterModel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { DiagramWrapper } from './DiagramWrapper';
import { getPersonMap, transform, withRouter, ndb } from './utilFunctions';
import { TreeNameLookup } from '../components/TreeNameLookup.js';
import { Opacity } from './Const';
import { TreeGroups } from '../components/TreeGroups.js';
import { TreeRelations } from '../components/TreeRelations.js';
import { GroupModel } from '../groupModel.js';
import { withSnackbar } from 'notistack';

const ENABLE_PRE_FETCHING = false;

function toFilterModel(filters) {
    const filterModel = new FilterModel(true);
    if (filters == null) {
        return filterModel;
    }
    filterModel.bloodline = filters.bloodline;
    filterModel.removeHiddenPeople = filters.removeHiddenPeople;
    filterModel.fromYear = filters.fromYear;
    filterModel.toYear = filters.toYear;
    filterModel.hiddenPeople = new Set(filters.hiddenPeople);
    filterModel.alwaysShownPeople = new Set(filters.alwaysShownPeople);
    for (const key of Object.keys(filters.textFilters)) {
        filterModel.textFilters[key] = {};
        filterModel.textFilters[key].choice = new Set(filters.textFilters[key].choice);
        filterModel.textFilters[key].all = new Set(filters.textFilters[key].all);
    }
    return filterModel;

}

// optional parameter passed to <ReactDiagram onModelChange = {handleModelChange}>
// called whenever model is changed

// class encapsulating the tree initialisation and rendering
class GenogramTree extends React.Component {

    constructor(props) {
        super(props);
        this.treeCache = {};
        this.wikiTreeCache = {};
        this.extensionId = null;
        this.prevRelationsJSON = {};
        let rawJSON = null;
        this.source = props.router.location.state ? props.router.location.state.source : null;
        this.sourceName = props.router.location.state ? props.router.location.state.sourceName : null;
        if (this.source) {
            rawJSON = props.router.location.state.relations;
            let rawFilters = props.router.location.state.filters
                ? toFilterModel(props.router.location.state.filters)
                : new FilterModel(true);
            this.handleModelChange = this.handleModelChange.bind(this);
            this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
            this.handlePopupExtend = this.handlePopupExtend.bind(this);
            this.getPersonsRelations = this.getPersonsRelations.bind(this);
            this.getPersonMap = this.getPersonMap.bind(this);
            this.setFocusPerson = this.setFocusPerson.bind(this);
            this.getFocusPerson = this.getFocusPerson.bind(this);

            this.setAnotherPerson = this.setAnotherPerson.bind(this);
            this.getAnotherPerson = this.getAnotherPerson.bind(this);

            this.requests = this.props.requests;
            this.isLoading = !rawJSON;

            this.groupModel = new GroupModel();

            this.state = {
                root: this.source,
                isUpdated: !this.isLoading,
                isLoading: this.isLoading,
                originalJSON: rawJSON,
                relationsJSON: rawJSON,
                kinshipJSON: null,
                selectedPerson: null,
                anotherPerson: null,
                isPopped: false,
                showStats: false,
                filters: rawFilters,
                // groupModel: new GroupModel(),
                showBtns: true,
                recentre: false,
                recommit: false,
                newDataAvailable: false,
                newData: null,
                defaultZoomSwitch: false,
                showLookup: false,
                showFilters: false,
                highlight: [],
                isShownBetween: false,
                isShownPath: true,
                fooState: [0],
                extendImpossible: new Set(),
            };
            this.componentRef = React.createRef();
        }
    }

    componentDidMount() {
        document.title = this.sourceName + "'s family tree - Ancesta";
    }

    flipZoomSwitch = () => {
        this.setState(prev => ({
            defaultZoomSwitch: !prev.defaultZoomSwitch
        }));
    }

    // Returns all persons nodes in tree
    getPersonsRelations() {
        return this.relations.filter((person) => {
            return person.name !== 'unknown' && person.gender !== 'LinkLabel';
        });
    }

    setFocusPerson(focusId) {
        this.setState({
            selectedPerson: focusId,
            recentre: true,
        });
    }

    getFocusPerson() {
        return this.state.selectedPerson;
    }

    getPersonMap() {
        return this.personMap;
    }

    setAnotherPerson(anotherId) {
        if (anotherId === null) {
            this.setState({
                anotherPerson: null,
            });
        } else {
            this.setState({
                anotherPerson: anotherId.id,
            });
        }
    }

    getAnotherPerson() {
        return this.state.anotherPerson;
    }

    handleModelChange(changes) {
        console.log('GoJS model changed!');
    }

    handleDiagramEvent(event) {
        if (!this.personMap.has(event.subject.part.key)) {
            return;
        }
        if (!this.state.highlight.includes(event.subject.part.key)) {
            this.state.highlight.length = 0;
        }
        this.setState({
            selectedPerson: event.subject.part.key,
            isPopped: true
        }
        );
    }

    integrateKinshipIntoRelationJSON(kinshipJSON, relationsJSON) {
        for (const key of Object.keys(kinshipJSON)) {
            const item = relationsJSON.items[key];
            if (!item) {
                continue;
            }
            if (item.kinships === undefined) {
                item.kinships = [];
                item.kinshipKeys = new Set();
            }

            const kinshipStrs = kinshipJSON[key].map((arr) => {
                arr.relation.reverse();
                return arr.relation.join(' of the ');
            });
            kinshipStrs.forEach((str, ix) => {
                const path = kinshipJSON[key][ix].path;
                const pathKey = path.join('');
                if (!item.kinshipKeys.has(pathKey)) {
                    item.kinshipKeys.add(pathKey);
                    item.kinships.push({ 'kinship': str, 'path': kinshipJSON[key][ix].path });
                }
            });
        }

        return relationsJSON;
    }

    // If id is provided, we search this id. Otherwise, it is a JSON provided by the user

    fetchRelations = async ({ id = null, depth = null, allSpouses = true } = {}) => {
        if (id === null) {
            await this.loadCustomData();
            return;
        }
        const [dbPromise, wikiDataPromise] = this.requests.relationsCacheAndWiki({
            id: id, depth: depth, allSpouses: allSpouses,
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

    loadRelations = (relationsJSON, id) => {
        console.log('Loading relations!');
        // Add reciprocal relations.
        for (const [key, relations] of Object.entries(relationsJSON.relations)) {
            for (const relation of relations) {
                if (relation.type === 'spouse') {
                    if (!relationsJSON.relations[relation.item1Id]) {
                        relationsJSON.relations[relation.item1Id] = [{
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'spouse',
                            typeId: 'WD-P26'
                        }];
                    } else if (!relationsJSON.relations[relation.item1Id].some((r) => r.type === 'spouse' && r.item1Id === key)) {
                        relationsJSON.relations[relation.item1Id].push({
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'spouse',
                            typeId: 'WD-P26'
                        });
                    }
                } else if (relation.type === 'father' || relation.type === 'mother') {
                    if (!relationsJSON.relations[relation.item1Id]) {
                        relationsJSON.relations[relation.item1Id] = [{
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'child',
                            typeId: 'WD-P40'
                        }];
                    } else if (!relationsJSON.relations[relation.item1Id].some((r) => (r.type === 'child') && r.item1Id === key)) {
                        relationsJSON.relations[relation.item1Id].push({
                            item1Id: key,
                            item2Id: relation.item1Id,
                            type: 'child',
                            typeId: 'WD-P40'
                        });
                    }
                } else if (relation.type === 'child') {
                    let gender = null;
                    for (let attr of relationsJSON.items[key].additionalProperties) {
                        if (attr.name === 'gender') {
                            gender = attr.value;
                            break;
                        }
                    }

                    if (!relationsJSON.relations[relation.item1Id]) {
                        if (gender === 'male') {
                            relationsJSON.relations[relation.item1Id] = [{
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'father',
                                typeId: 'WD-P22'
                            }];
                        } else if (gender === 'female') {
                            relationsJSON.relations[relation.item1Id] = [{
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'mother',
                                typeId: 'WD-P25'
                            }];
                        }
                    } else if (!relationsJSON.relations[relation.item1Id].some((r) => (r.type === 'father' || r.type === 'mother') && r.item1Id === key)) {
                        if (gender === 'male') {
                            relationsJSON.relations[relation.item1Id].push({
                                item1Id: key,
                                item2Id: relation.item1Id,
                                type: 'father',
                                typeId: 'WD-P22'
                            });
                        } else if (gender === 'female') {
                            relationsJSON.relations[relation.item1Id].push({
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
            this.state.originalJSON = relationsJSON;
        } else {
            this.mergeRelations(this.state.originalJSON, relationsJSON);
        }
        this.fetchKinships(this.state.root, this.state.originalJSON);
        this.applyFilterAndDrawTree();
        if (id == null || id === undefined) {
            this.state.isLoading = false;
            this.state.isUpdated = true;
            this.state.selectedPerson = this.state.root;
        } else {
            this.setState({
                isLoading: false,
                isUpdated: true,
                selectedPerson: id,
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
        }
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
        if (filters.bloodline || filters.fromYear !== '' || filters.toYear !== '' || useTextFilter || filters.removeHiddenPeople) {
            // Map from item ID to opacity
            let visited = {};
            visited[this.state.root] = { opacity: Opacity.normal };
            if (filters.bloodline) {
                console.log('血胤');
                var frontier = [this.state.root];
                var descendants = [];

                while (frontier.length > 0 || descendants.length > 0) {
                    var cur = frontier.shift();
                    if (cur) {
                        if (this.state.originalJSON.relations[cur]) {
                            var newElems = this.state.originalJSON.relations[cur]
                                .filter((r) => r.type !== 'spouse' && (!visited[r.item1Id] || visited[r.item1Id].opacity !== Opacity.normal));
                            var newFrontier = newElems.filter((r) => r.type !== 'child').map((r) => r.item1Id);
                            var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                            newElems.map((r) => r.item1Id).forEach((id) => visited[id] = { opacity: Opacity.normal });
                            frontier.push(...newFrontier);
                            descendants.push(...newDescendants);
                        }
                    } else {
                        cur = descendants.shift();
                        if (this.state.originalJSON.relations[cur]) {
                            var newElems = this.state.originalJSON.relations[cur]
                                .filter((r) => r.type !== 'spouse' && (!visited[r.item1Id] || visited[r.item1Id].opacity !== Opacity.normal));
                            var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                            newDescendants.forEach((id) => {
                                visited[id] = { opacity: Opacity.normal };
                                visited[id].originalOpacity = visited[id].opacity;
                            });
                            newElems.filter((r) => !visited[r.item1Id]).map((r) => r.item1Id).forEach((id) => {
                                visited[id] = { opacity: Opacity.outlier };
                            });
                            descendants.push(...newDescendants);
                        }
                    }
                }
            } else {
                Object.keys(this.state.originalJSON.items).forEach((id) => {
                    visited[id] = { opacity: Opacity.normal };
                    visited[id].originalOpacity = visited[id].opacity;
                });
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
            // filter on From birth year
            if (filters.fromYear !== '') {
                for (const [k, _] of Object.entries(visited)) {
                    let dob = this.state.originalJSON.items[k].additionalProperties.filter((p) => p.name == 'date of birth')[0];
                    if (dob === undefined) {
                        delete visited[k];
                        continue;
                    }
                    dob = ndb(dob.value.split('T')[0]);
                    let fromYear = filters.fromYear[0] == '-' ? '-' + (filters.fromYear.substring(1)).padStart(6, '0') : filters.fromYear.padStart(4, '0');
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
                    let toYear = filters.toYear[0] == '-' ? '-' + (filters.toYear.substring(1)).padStart(6, '0') : filters.toYear.padStart(4, '0');
                    if (new Date(dob).getFullYear() > new Date(toYear).getFullYear()) {
                        delete visited[k];
                        continue;
                    }
                }
            }

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
                        visited[ov] = { opacity: Opacity.outlier };
                    }
                })
            }

            // Filter out hidden people
            if (filters.removeHiddenPeople) {
                this.state.filters.hiddenPeople.forEach((k) => delete visited[k]);
            } else {
                this.state.filters.hiddenPeople.forEach((k) => {
                    visited[k] = { opacity: Opacity.hidden };
                    visited[k].originalOpacity = visited[k].opacity;
                });
            }

            // Add always shown people
            this.state.filters.alwaysShownPeople.forEach((k) => {
                visited[k] = { opacity: Opacity.normal };
                visited[k].originalOpacity = visited[k].opacity;
            })

            var filteredJSON = { targets: this.state.originalJSON.targets, items: {}, relations: {} };
            Object.keys(visited).forEach((v) => {
                filteredJSON.items[v] = { ...this.state.originalJSON.items[v], ...visited[v] };
                if (this.state.originalJSON.relations[v]) {
                    filteredJSON.relations[v] = this.state.originalJSON.relations[v].filter((r) => visited[r.item1Id]);
                }
            });
            this.state.relationsJSON = filteredJSON;
        } else {
            this.state.relationsJSON = JSON.parse(JSON.stringify(this.state.originalJSON));
        }
    }

    async fetchKinships(id, relationsJSON) {
        const newRelationJSON = await this.injectKinship(id, relationsJSON);
        this.setState({ originalJSON: newRelationJSON });
    }

    injectKinship = async (id, relationsJSON) => {
        const kinshipJSON = await this.requests.relationCalc({
            start: id,
            relations: Object.values(relationsJSON.relations).flat(),
        });
        return this.integrateKinshipIntoRelationJSON(kinshipJSON, relationsJSON);
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

    displayExtendImpossibleSnackbar = () => this.props.enqueueSnackbar(
        'Extend not possible for selected person. No new relatives found.',
        {
            autoHideDuration: 2_000,
            variant: 'warning',
        }
    );

    async handlePopupExtend() {
        if (this.state.isLoading) {
            alert('Please wait for the current expansion to finish');
            return;
        }
        const selectedPerson = this.state.selectedPerson;
        this.prevRelationsJSON = JSON.parse(JSON.stringify(this.state.relationsJSON));
        console.assert(this.prevRelationsJSON !== undefined);
        if (
            this.state.extendImpossible.has(this.state.selectedPerson)
        ) {
            this.displayExtendImpossibleSnackbar();
            return;
        }
        this.setState({
            isLoading: true,
            isUpdated: false,
        });
        await this.fetchFromCacheOrBackend(this.state.selectedPerson, 1, false);
        // this.forceUpdate();
        if (
            _.isEqual(this.prevRelationsJSON, this.state.relationsJSON)
        ) {
            this.displayExtendImpossibleSnackbar();
        }
        this.setState(prev => {
            const extendImpossible = prev.extendImpossible;
            extendImpossible.add(selectedPerson);
            return { extendImpossible };
        });
    }

    resetDiagram = async () => {
        location.reload();
    }

    // renders ReactDiagram

    render() {
        if (this.source == null) {
            alert('Invalid URL!');
            return <p>Invalid URL!</p>
        }

        if (this.state.relationsJSON == null) {
            this.fetchFromCacheOrBackend(this.source, 2);

            return (
                <>
                    <Toolbar onlyHome={true} />
                    <Container style={{ height: '100vh' }} className='d-flex justify-content-center'>
                        <ModalSpinner />
                    </Container>
                </>
            );
        }

        var updateDiagram = false;

        if (this.state.isUpdated) {
            this.state.isUpdated = false;
            this.applyFilterAndDrawTree();
            this.relations = transform(this.state.relationsJSON);
            this.personMap = getPersonMap(Object.values(this.state.originalJSON.items), this.state.originalJSON.relations);
            // show all attributes at start

            this.groupModel.initialize([...this.personMap.values()].map((m) => [...m.keys()]).sort((a, b) => b.length - a.length)[0]);
            // this.state.groupModel.globalSet = new Set([...this.personMap.values()].map((m) => [...m.keys()]).sort((a, b) => b.length - a.length)[0])
            // this.state.groupModel.groupItemSet = new Set([...this.state.groupModel.globalSet])

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
        var isShownPath = false;
        if (this.state.isShownPath) {
            isShownPath = true;
            this.state.isShownPath = false;
        }
        this.personMap = getPersonMap(Object.values(this.state.originalJSON.items), this.state.originalJSON.relations);

        // if (
        //     !this.state.isLoading &&
        //     _.isEqual(this.prevRelationsJSON, this.state.relationsJSON)
        // ) {
        //     this.displayExtendImpossibleSnackbar();
        // }

        return (
            <>
                <Container fluid className='pe-none p-0 h-100 justify-content-between' style={{
                    position: 'fixed',
                    zIndex: 1
                }}>
                    <Row>
                        {this.state.showBtns &&
                            <Toolbar genogramTree={this} />
                        }
                    </Row>
                    <Row className='me-4 mh-50 justify-content-end'>
                        <Col xs='4'>
                            {this.state.showFilters &&
                                <TreeFilter
                                    allPeople={Object.values(this.state.originalJSON.items)}
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
                                    onChange={(isReset) => this.setState({ isUpdated: true, isLoading: true, showFilters: !isReset })}
                                    onPrune={() => {
                                        this.state.originalJSON.relations = JSON.parse(JSON.stringify(this.state.relationsJSON.relations));
                                        for (const key of Object.keys(this.state.originalJSON.items)) {
                                            if (!this.state.relationsJSON.items[key] && key !== this.state.root) {
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
                                    allPeople={Object.values(this.state.originalJSON.items)}
                                    onPersonSelection={(_, v) => this.setFocusPerson(v.key)}
                                    onAnotherPersonSelection={(_, v) => this.setAnotherPerson(v)}
                                    getPersonsRelations={this.getPersonsRelations}
                                    getFocusPerson={this.getFocusPerson}
                                    getAnotherPerson={this.state.anotherPerson}
                                    getPersonMap={this.getPersonMap}
                                    onChange={async () => {
                                        await this.fetchKinships(this.state.selectedPerson, this.state.originalJSON);
                                        this.setState({ isPopped: false, isShownBetween: true });
                                    }}
                                />
                            }
                            {
                                this.state.showGroups &&
                                /* ### setStates here used for re-rendering only ### */
                                <TreeGroups
                                    groupModel={this.groupModel}
                                    personMap={this.personMap}
                                    changeGroupSelection={(groupId) => {
                                        this.groupModel.setCurrentGroupId(groupId);
                                        this.setState({ showGroups: true });
                                    }}
                                    addNewGroup={() => {
                                        this.groupModel.addNewGroup();
                                        this.setState({ showGroups: true });
                                    }}
                                    externUpdate={() => { this.setState({ showGroups: true }) }}
                                    renameGroup={(name) => {
                                        console.log(name);
                                        this.groupModel.renameCurrGroup(name);
                                        this.setState({ showGroups: true });
                                    }}
                                />
                            }
                        </Col>
                    </Row>
                    <Row>
                        <Col xs='2'>
                            {this.state.isLoading &&
                                <div className='pe-auto'>
                                    <ModalSpinner />
                                </div>
                            }
                        </Col>
                    </Row>
                </Container>

                {
                    this.state.isPopped &&
                    <div className='popup'>
                        <PopupInfo
                            closePopUp={() => this.setState({ isPopped: false })}
                            info={this.personMap.get(this.state.selectedPerson)}
                            id={this.state.selectedPerson}
                            groupModel={this.groupModel}
                            onNew={async () => {
                                this.state.root = this.state.selectedPerson;
                                await this.fetchKinships(this.state.root, this.state.originalJSON);
                            }}
                            isShown={this.state.filters.alwaysShownPeople.has(this.state.selectedPerson)}
                            isHidden={this.state.filters.hiddenPeople.has(this.state.selectedPerson)}
                            onFilterModeChanged={newFilterMode => {
                                let hidden = this.state.filters.hiddenPeople;
                                let shown = this.state.filters.alwaysShownPeople;
                                switch (newFilterMode) {
                                    case 0:
                                        hidden.delete(this.state.selectedPerson);
                                        shown.delete(this.state.selectedPerson);
                                        break;
                                    case 1:
                                        hidden.add(this.state.selectedPerson);
                                        shown.delete(this.state.selectedPerson);
                                        break;
                                    case 2:
                                        hidden.delete(this.state.selectedPerson);
                                        shown.add(this.state.selectedPerson);
                                        break;
                                }

                                this.setState({ recommit: true });
                            }}
                            onExtend={this.handlePopupExtend}
                            allowExtend={this.props.allowExtend}
                            switchToRelations={() => this.setState({ isPopped: false, showRelations: true })}
                            extendImpossible={this.state.extendImpossible.has(this.state.selectedPerson)}
                        />
                    </div>
                }

                {
                    this.state.showStats &&
                    <div className='popup'>
                        <StatsPanel
                            closePopUp={() => this.setState({ showStats: false })}
                            data={this.state.relationsJSON}
                        />
                    </div>
                }

                {
                    this.state.showRelations &&
                    <div className='popup'>
                        <TreeRelations
                            closePopUp={() => this.setState({ showRelations: false, isShownPath: true })}
                            info={this.personMap.get(this.state.selectedPerson)}
                            highlight={this.state.highlight}
                            root={this.state.root}
                        />
                    </div>
                }

                {
                    this.state.isShownBetween &&
                    <div className='popup'>
                        <RelSearchResult
                            closePopUp={() => {
                                if (this.state.fooState[0] === 2) {
                                    console.log(this.state.highlight);
                                    // this.setState({ isShownBetween: false, isShownPath: true, fooState: 0 });
                                    return;
                                }
                                const notInGraph = this.state.highlight.filter((p) => !this.state.relationsJSON.items[p]);
                                if (notInGraph.length != 0) {
                                    this.state.fooState[0] = 1;
                                    this.setState({ isShownBetween: true });
                                } else {
                                    this.setState({ isShownBetween: false, isShownPath: true });
                                }
                            }}
                            info={this.personMap.get(this.state.anotherPerson)}
                            highlight={this.state.highlight}
                            root={this.state.selectedPerson}
                            fooState={this.state.fooState}
                        />
                    </div>
                }

                <div className='tree-box'>
                    <DiagramWrapper
                        highlight={this.state.highlight}
                        updateDiagram={updateDiagram}
                        recentre={recentre}
                        recommit={recommit}
                        isShownPath={isShownPath}
                        editCount={this.props.editCount}
                        nodeDataArray={this.relations}
                        onModelChange={this.handleModelChange}
                        onDiagramEvent={this.handleDiagramEvent}
                        hiddenPeople={this.state.filters.hiddenPeople}
                        alwaysShownPeople={this.state.filters.alwaysShownPeople}
                        ref={this.componentRef}
                        root={this.state.root}
                        getFocusPerson={this.getFocusPerson}
                        defaultZoomSwitch={this.state.defaultZoomSwitch}
                        personMap={this.personMap}
                    />

                </div>
            </>
        );
    }

    fetchFromCacheOrBackend = async (id, depth, allSpouses) => {
        if (this.state.relationsJSON == null || !ENABLE_PRE_FETCHING) {
            await this.fetchRelations({ id: id, depth: depth, allSpouses: allSpouses });
        }
        if (!ENABLE_PRE_FETCHING) {
            return;
        }
        const extendPromise = this.extendInCache(id) ? this.extendFromCache(id) : Promise.resolve();
        this.extensionId = id;
        const [dbPromise, wikiDataPromise] = this.requests.relationsCacheAndWiki({
            id: id, depth: depth + 1, allSpouses: allSpouses,
            visitedItems: this.state.originalJSON ? Object.keys(this.state.originalJSON.items) : []
        });
        const dbRes = await dbPromise;
        if (this.requests.dbResEmpty(dbRes)) {
            const wikiDataRes = await wikiDataPromise;
            const updatePromise = this.updateTreeCache(wikiDataRes);
            return Promise.all([extendPromise, updatePromise]);
        }
        const updatePromise = this.updateTreeCache(dbRes);
        const wikiDataRes = await wikiDataPromise;
        if (this.containsMoreData(
            this.neighborTree(wikiDataRes, id),
            this.neighborTree(dbRes, id)
        )) {
            this.updateWikiTreeCache(wikiDataRes, id);
        }
        return Promise.all([extendPromise, updatePromise]);
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
        const curTree = this.state.relationsJSON;
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
        console.assert(!_.isEmpty(tree));
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

export default withRouter(withSnackbar(GenogramTree));
