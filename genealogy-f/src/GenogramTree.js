import {FamilyTree} from './components/family-tree/FamilyTree';
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './components/requests';
import React from 'react';
import ClipLoader from 'react-spinners/ClipLoader';
import * as go from 'gojs';
import {ReactDiagram} from 'gojs-react';
import './App.css';
import PopupInfo from './components/popup-info/PopupInfo.js'
import './GenogramTree.css';
import { MdFolderShared, MdPadding } from 'react-icons/md';
import {exportComponentAsPNG} from 'react-component-export-image';
import {StatsPanel} from './components/stats-panel/StatsPanel';
import {downloadJsonFile} from './components/custom-upload/exportAsJson';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import EscapeCloseable from './components/escape-closeable/EscapeCloseable';
import { Link } from 'react-router-dom';
import './components/shared.css';
import _ from 'lodash';
import Button from 'react-bootstrap/Button';

import { BiHomeAlt } from 'react-icons/bi'
import { AiFillFilter } from 'react-icons/ai'
import { FilterModel } from './filterModel';

function withRouter(Component) {
  function ComponentWithRouterProp(props) {
    let location = useLocation();
    let navigate = useNavigate();
    let params = useParams();
    return (
      <Component
        {...props}
        router={{ location, navigate, params }}
      />
    );
  }

  return ComponentWithRouterProp;
}

// comparing date using js inbuilt date
export function applyDateOfBirthFilter(id, dateFrom, dateTo, idPerson) {
  if (dateFrom == '' && dateTo == '') {
    return true;
  }

  const target = idPerson.id;
  if (target === null) {return false;}
  const addProps = target.additionalProperties;
  const father = addProps.filter(p => p.name == 'date of birth');
  // could be improved for large chain of unknown date of birth people.
  if (father[0] === null || father[0] === undefined || father[0].length == 0) {
    const r = relMap.get(id);
    if (!r) {
      return false;
    }
    const mother = r.mother === null || r.mother === undefined ? false : applyDateOfBirthFilter(r.mother, dateFrom, dateTo, idPerson)
    const father = r.father === null || r.father === undefined ? false : applyDateOfBirthFilter(r.father, dateFrom, dateTo, idPerson)
    // check if both parents are out of the date range, if so then assume unknown also outside, otherwise leave in.
    return mother || father;
  }

  const date = (father[0].value).split('T');
  const d3 = new Date(date[0]);
  const d1 = new Date(-8640000000000000);
  if (dateFrom !== undefined && dateFrom !== null && dateFrom != '') {
    d1.setFullYear(dateFrom, 0, 1);
  }
  const d2 = new Date(8640000000000000);
  if (dateTo !== undefined && dateTo !== null && dateTo != '') {
    d2.setFullYear(dateTo, 0, 1);
  }

  return d1 <= d3 && d3 <= d2;
}

export function applyFamilyFilter(id, familyName, idPerson) {
  if (familyName == '') {
    return true;
  }
  const target = idPerson.id;
  if (target == null) {
    return false;
  }
  const addProps = target.additionalProperties;
  // can we make this generic in the future // TODO: WE WILL
  const family = addProps.filter(p => p.name == 'family');
  if (family[0] == null || family[0].length == 0 || family[0].value == null) {
    return false;
  }
  return family.some((x) => x.value.toLowerCase().includes(familyName.toLowerCase()));
}

// global map from id of person to their attributes, used to change opacity for filtering in the goJs diagram.
var relMap = new Map();

function transform(data) {
  relMap = new Map();
  
  Object.values(data.items).forEach((person) => {
    let singlePerson = new Map();
    for (let attr of person.additionalProperties) {
      if (attr.name === 'gender') {
        singlePerson.set('gender', attr.value);
      }
    }

    singlePerson.set('key', person.id);
    singlePerson.set('name', person.name);
    singlePerson.set('spouse', []);
    relMap.set(person.id, Object.fromEntries(singlePerson));
  });

  for (const [key, relations] of Object.entries(data.relations)) {
    var sourceItem =  data.items[key];
    if (sourceItem === undefined) {
      console.log('------- ERROR -------- key :' + key + 'not found in data.items');
      continue;
    }

    var personalRelation = relMap.get(key);
    
    for (const relation of relations) {
      // check each relationship if so update record accordingly
      if (relation.type === 'child') {
        // personalRelation.child;
        // continue;
      }
      if (relation.type === 'mother') {
          personalRelation.mother = relation.item1Id;
      }
      if (relation.type === 'father') {
          personalRelation.father = relation.item1Id;
      }
      if (relation.type === 'spouse') {
        personalRelation.spouse.push(relation.item1Id);
      }
      relMap.set(key, personalRelation);
    }
  }

  var newOutput = [];

  for (let key of relMap.keys()) {
    let r = relMap.get(key);
    r.opacity = '0.9';
  }

  // add unknown nodes for unknown parent
  for (let key of relMap.keys()) {
    let r = relMap.get(key);
    relMap = addUnknown(r, relMap);
  }

  // convert map into array
  for (let key of relMap.keys()) {
    newOutput.push(relMap.get(key));
  }
  // console.log(newOutput);
  return newOutput;

}

function addUnknown(mfs, relMap) {
  if (mfs.mother && !mfs.father) {
    let newF = {key: '_' + mfs.mother, name: 'unknown', gender: 'male', opacity: '0.2'};
    // marry parent to unknown and set child parent to unknown
    newF.spouse = [mfs.mother];
    mfs.father = newF.key;
    relMap.set(newF.key, newF);
    relMap.set(mfs.key, mfs);
  }

  // case of unknown mother - temporarily replace with 'unknown' node
  if (!mfs.mother && mfs.father) {
    let newM = {key: '_' + mfs.father, name: 'unknown', gender: 'female', opacity: '0.2'};
    // marry parent to unknown and set child parent to unknown
    newM.spouse = [mfs.father];
    mfs.mother = newM.key;
    relMap.set(newM.key, newM);
    relMap.set(mfs.key, mfs);
  }

  return relMap;
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Create a map of maps
// Outer map: personId -> inner map
// Inner map: property -> value
function getPersonMap(data) {
  let personMap = new Map;
  for (let person of data) {
    const personId = person.id;
    let attributes = new Map;
    attributes.set('Name', person.name);

    if (person.description !== '') {
      attributes.set('Description', person.description);
    }


    let attrMap = new Map;
    // wash data for additionalProperties
    for (let attr of person.additionalProperties) {
      // If field doesn't present, don't put in the Map
      if (attr.value === null || attr.value === '') continue;
      if (attr.propertyId === 'WD-P19' || attr.propertyId === 'WD-P20') continue; // not used by new PoB, PoD design
      if (attr.name === 'family name' || attr.name === 'given name') continue;    // this two fields not show, use personal name instead

      if (attrMap.has(attr.name) && attr.name === 'family') {
        let newVal = attrMap.get(attr.name) + '; ' + attr.value;
        attrMap.set(attr.name, newVal);
      } else if (attrMap.has(attr.name)) {
        continue;
      } else {
        attrMap.set(attr.name, attr.value);
      }
    }

    attrMap.forEach((value, key) => {
      switch (key) {
        case 'date of birth':
          value = value.replace(/^0+/, '').split('T')[0];
        case 'date of death':
          value = value.replace(/^0+/, '').split('T')[0];
        default:
      }
      attributes.set(capitalizeFirstLetter(key), value);
    });

    personMap.set(personId, attributes)
  }
  return personMap;
}

const $ = go.GraphObject.make;

export class DiagramWrapper extends React.Component {
  static relMap = relMap;
  constructor(props) {
    super(props);
    this.diagramRef = React.createRef();
    this.nodeDataArray = props.nodeDataArray;
    this.yearFrom = props.yearFrom;
    this.yearTo = props.yearTo;
    this.root = props.root;
    this.getFocusPerson = props.getFocusPerson;
    this.state = { diagram: undefined, isFirstRender: true };
    this.init();
  }

  componentDidMount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener('ObjectSingleClicked', this.props.onDiagramEvent);
    }
    document.getElementById("svgButton").addEventListener("click", this.makeSvg);
  }

  componentWillUnmount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.removeDiagramListener('ObjectSingleClicked', this.props.onDiagramEvent);
    }
  }

  init() {
      if (!(this.state.diagram === undefined)) {
        this.diagram = this.state.diagram;
        return;
      }

      this.state.diagram = $(go.Diagram,
        {
          // initialAutoScale: go.Diagram.initialAutoScale,
          initialContentAlignment: go.Spot.Center,
          'undoManager.isEnabled': false,
          // when a node is selected, draw a big yellow circle behind it
          nodeSelectionAdornmentTemplate:
            $(go.Adornment, 'Auto',
              { layerName: 'Grid' },  // the predefined layer that is behind everything else
              $(go.Shape, 'Circle', {fill: '#c1cee3', stroke: null }),
              $(go.Placeholder, { margin: 0 })
            ),
          scrollMargin: 200,
          layout:  // use a custom layout, defined below
            $(GenogramLayout, { direction: 90, layerSpacing: 50, columnSpacing: 0 }),
          'InitialLayoutCompleted': _ => {
            var node = this.diagram.findNodeForKey(this.getFocusPerson());
            if (node == null) {
              node = this.diagram.findNodeForKey(this.root);
            }
            if (node != null) {
              this.diagram.commandHandler.scrollToPart(node);
              this.diagram.select(node);
            }
          }
        })
      this.diagram = this.state.diagram;
      // determine the color for each attribute shape
      function attrFill(a) {
        switch (a) {
          case 'A': return '#00af54'; // green
          case 'B': return '#f27935'; // orange
          case 'C': return '#d4071c'; // red
          case 'D': return '#70bdc2'; // cyan
          case 'E': return '#fcf384'; // gold
          case 'F': return '#e69aaf'; // pink
          case 'G': return '#08488f'; // blue
          case 'H': return '#866310'; // brown
          case 'I': return '#9270c2'; // purple
          case 'J': return '#a3cf62'; // chartreuse
          case 'K': return '#91a4c2'; // lightgray bluish
          case 'L': return '#af70c2'; // magenta
          case 'S': return '#d4071c'; // red
          default: return 'transparent';
        }
      }
      // determine the geometry for each attribute shape in a male;
      // except for the slash these are all squares at each of the four corners of the overall square
      const tlsq = go.Geometry.parse('F M1 1 l19 0 0 19 -19 0z');
      const trsq = go.Geometry.parse('F M20 1 l19 0 0 19 -19 0z');
      const brsq = go.Geometry.parse('F M20 20 l19 0 0 19 -19 0z');
      const blsq = go.Geometry.parse('F M1 20 l19 0 0 19 -19 0z');
      const slash = go.Geometry.parse('F M38 0 L40 0 40 2 2 40 0 40 0 38z');
      function maleGeometry(a) {
        switch (a) {
          case 'A': return tlsq;
          case 'B': return tlsq;
          case 'C': return tlsq;
          case 'D': return trsq;
          case 'E': return trsq;
          case 'F': return trsq;
          case 'G': return brsq;
          case 'H': return brsq;
          case 'I': return brsq;
          case 'J': return blsq;
          case 'K': return blsq;
          case 'L': return blsq;
          case 'S': return slash;
          default: return tlsq;
        }
      }

      // determine the geometry for each attribute shape in a female;
      // except for the slash these are all pie shapes at each of the four quadrants of the overall circle
      const tlarc = go.Geometry.parse('F M20 20 B 180 90 20 20 19 19 z');
      const trarc = go.Geometry.parse('F M20 20 B 270 90 20 20 19 19 z');
      const brarc = go.Geometry.parse('F M20 20 B 0 90 20 20 19 19 z');
      const blarc = go.Geometry.parse('F M20 20 B 90 90 20 20 19 19 z');
      function femaleGeometry(a) {
        switch (a) {
          case 'A': return tlarc;
          case 'B': return tlarc;
          case 'C': return tlarc;
          case 'D': return trarc;
          case 'E': return trarc;
          case 'F': return trarc;
          case 'G': return brarc;
          case 'H': return brarc;
          case 'I': return brarc;
          case 'J': return blarc;
          case 'K': return blarc;
          case 'L': return blarc;
          case 'S': return slash;
          default: return tlarc;
        }
      }

      // two different node templates, one for each sex,
      // named by the category value in the node data object
      this.diagram.nodeTemplateMap.add('male',  // male
        $(go.Node, 'Vertical',
        // TODO can make this non-selectable with selectable: false, but we want clickable but not movable?
        // see this for how to do stuff on click? - https://gojs.net/latest/extensions/Robot.html
          {movable: true, locationSpot: go.Spot.Center, locationObjectName: 'ICON', selectionObjectName: 'ICON'},
          new go.Binding('opacity', 'hide', h => h ? 0 : 1),
          new go.Binding('pickable', 'hide', h => !h),
          $(go.Panel,
            { name: 'ICON' },
            $(go.Shape, 'Square',
              {width: 40, height: 40, strokeWidth: 2, fill: '#7ec2d7', stroke: '#919191', portId: '' },
              new go.Binding('fill', 'fill'),
              new go.Binding('opacity', 'opacity')),
            $(go.Panel,
              { // for each attribute show a Shape at a particular place in the overall square
                itemTemplate:
                  $(go.Panel,
                    $(go.Shape,
                      { stroke: null, strokeWidth: 0 },
                      new go.Binding('fill', '', attrFill),
                      new go.Binding('geometry', '', maleGeometry))
                  ),
                margin: 1
              },
              new go.Binding('itemArray', 'a')
            )
          ),
          $(go.TextBlock,
            { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' },
            new go.Binding('text', 'name'), new go.Binding('opacity', 'opacity'))
        ));

      this.diagram.nodeTemplateMap.add('female',  // female
        $(go.Node, 'Vertical',
          { movable: true, locationSpot: go.Spot.Center, locationObjectName: 'ICON', selectionObjectName: 'ICON' },
          new go.Binding('opacity', 'hide', h => h ? 0 : 1),
          new go.Binding('pickable', 'hide', h => !h),
          $(go.Panel,
            { name: 'ICON' },
            $(go.Shape, 'Circle',
              { width: 40, height: 40, strokeWidth: 2, fill: '#ff99a8', stroke: '#a1a1a1', portId: '' },
              new go.Binding('opacity', 'opacity')),
            $(go.Panel,
              { // for each attribute show a Shape at a particular place in the overall circle
                itemTemplate:
                  $(go.Panel,
                    $(go.Shape,
                      { stroke: null, strokeWidth: 0 },
                      new go.Binding('fill', '', attrFill),
                      new go.Binding('geometry', '', femaleGeometry))
                  ),
                margin: 1
              },
              new go.Binding('itemArray', 'a')
            )
          ),
          $(go.TextBlock,
            { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' },
            new go.Binding('text', 'name'), new go.Binding('opacity', 'opacity'))
        ));

      // the representation of each label node -- nothing shows on a Marriage Link
      this.diagram.nodeTemplateMap.add('LinkLabel',
        $(go.Node, { selectable: false, width: 1, height: 1, fromEndSegmentLength: 20 }));


      this.diagram.linkTemplate =  // for parent-child relationships
        $(go.Link,
          {
            routing: go.Link.AvoidsNodes,
            fromSpot: go.Spot.Bottom,
            toSpot: go.Spot.Top,
            layerName: 'Background', selectable: false,
          },
          $(go.Shape, {stroke: '#424242', strokeWidth: 0.5}, new go.Binding('opacity', 'opacity'))
        );

      this.diagram.linkTemplateMap.add('Marriage',  // for marriage relationships
        $(ArcLink,
          {
            routing: go.Link.Normal,
            fromSpot: go.Spot.Top,
            toSpot: go.Spot.Top,
            selectable: false,
            layerName: 'Background'
          },
          $(go.Shape, { strokeWidth: 1, stroke: '#5d8cc1' /* blue */}, new go.Binding('opacity', 'opacity'))
        ));

      this.diagram.linkTemplateMap.add('hasChild',  // between parents
      $(ArcLink,
        {
          routing: go.Link.Normal,
          fromSpot: go.Spot.Bottom,
          toSpot: go.Spot.Bottom,
          selectable: false,
          layerName: 'Background'
        },
        $(go.Shape, { strokeWidth: 1, stroke: '#ff0000' /* red */}, new go.Binding('opacity', 'opacity'))
      ));

    return this.diagram;
  }

  downloadSvg = (blob) => {
    const url = window.URL.createObjectURL(blob);
    const filename = "family-tree.svg";

    const a = document.createElement("a");
    a.style = "display: none";
    a.href = url;
    a.download = filename;

    // IE 11
    if (window.navigator.msSaveBlob !== undefined) {
      window.navigator.msSaveBlob(blob, filename);
      return;
    }

    document.body.appendChild(a);
    requestAnimationFrame(() => {
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  makeSvg = () => {
    const svg = this.state.diagram.makeSvg({scale: 1, background: "white"});
    const svgstr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgstr], {type: "image/svg+xml"});
    this.downloadSvg(blob);
  }

  // create and initialize the Diagram.model given an array of node data representing people
  setupDiagram(array, focusId) {
    this.diagram.model =
      new go.GraphLinksModel(
        { // declare support for link label nodes
          linkLabelKeysProperty: 'labelKeys',
          // this property determines which template is used
          nodeCategoryProperty: 'gender',
          // if a node data object is copied, copy its data.a Array
          copiesArrays: true,
          // create all of the nodes for people
          //TODO this should be got from this.state.relationJSON from App.js
          nodeDataArray: array
        });
    this.setupParents(this.diagram);
    this.setupMarriages(this.diagram);

    const node = this.diagram.findNodeForKey(focusId);
    if (node !== null) {
      this.diagram.select(node);

      // this.diagram.commandHandler.scrollToPart(node);
      this.diagram.centerRect(node.actualBounds);
    }
  }

  findMarriage(diagram, a, b) {  // A and B are node keys
    const nodeA = diagram.findNodeForKey(a);
    const nodeB = diagram.findNodeForKey(b);
    if (nodeA !== null && nodeB !== null) {
      const it = nodeA.findLinksBetween(nodeB);  // in either direction
      while (it.next()) {
        const link = it.value;
        // Link.data.category === 'Marriage' means it'gender a marriage relationship
        if (link.data !== null && link.data.category === 'Marriage') return link;
      }
    }
    return null;
  }

  findHasChild(diagram, a, b) {  // A and B are node keys
    const nodeA = diagram.findNodeForKey(a);
    const nodeB = diagram.findNodeForKey(b);
    if (nodeA !== null && nodeB !== null) {
      const it = nodeA.findLinksBetween(nodeB);  // in either direction
      while (it.next()) {
        const link = it.value;
        // Link.data.category === 'Marriage' means it'gender a marriage relationship
        if (link.data !== null && link.data.category === 'hasChild') return link;
      }
    }
    return null;
  }

  // now process the node data to determine marriages
  setupMarriages(diagram) {
    const model = diagram.model;
    const nodeDataArray = model.nodeDataArray;
    for (let i = 0; i < nodeDataArray.length; i++) {
      const data = nodeDataArray[i];
      const key = data.key;
      // filtering
      let uxs = data.spouse;
      if (uxs !== undefined) {
        if (typeof uxs === 'string') uxs = [uxs];
        for (let j = 0; j < uxs.length; j++) {
          const wife = uxs[j];
          const wdata = model.findNodeDataForKey(wife);
          if (key === wife) {
            console.log('cannot create Marriage relationship with self' + wife);
            continue;
          }
          if (!wdata) {
              console.log('cannot create Marriage relationship with unknown person ' + wife);
              continue;
          }
          const link = this.findMarriage(diagram, key, wife);
          if (link == null && diagram.findNodeForKey(wife)) {
            const hasChildLink = this.findHasChild(diagram, key, wife);
            // add a label node for the marriage link
            // add the marriage link itself, also referring to the label node
            var mdata = {from: key, to: wife, category: 'Marriage'};
            if (!hasChildLink) {
              const mlab = { gender: 'LinkLabel' };
              model.addNodeData(mlab);
              mdata.labelKeys = [mlab.key];
            }
            model.addLinkData(mdata);
          }
        }
      }
    }
  }

  // process parent-child relationships once all marriages are known
  setupParents(diagram) {
    const model = diagram.model;
    const nodeDataArray = model.nodeDataArray;
    for (let i = 0; i < nodeDataArray.length; i++) {
      const data = nodeDataArray[i];
      const key = data.key;
      const mother = data.mother;
      const father = data.father;

      if (mother && father && diagram.findNodeForKey(father) && diagram.findNodeForKey(mother)) {    
        var link = this.findHasChild(diagram, father, mother);
        if (link == null) {
          // add a label node for the hasChild link
          const mlab = { gender: 'LinkLabel' };
          model.addNodeData(mlab);
          this.diagram.model.addLinkData({ from: father, to: mother, labelKeys: [mlab.key], category: 'hasChild' });
          link = this.findHasChild(diagram, father, mother);
        }

        const mdata = link.data;
        if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) {
          console.log('Should not happen');
          continue;
        } 
        const mlabkey = mdata.labelKeys[0];
        const cdata = { from: mlabkey, to: key };
        this.diagram.model.addLinkData(cdata);
      }
    }
  }

  render() {
    if (this.state.isFirstRender || this.props.updateDiagram) {
      this.state.isFirstRender = false;

      // From graph expand
      let focusId = this.getFocusPerson();
      if (focusId !== null) {
        this.setupDiagram(this.props.nodeDataArray, focusId);
      }
      else {
        this.setupDiagram(this.props.nodeDataArray, this.props.nodeDataArray[0].key);
      }
    }

    if (this.props.recentre) {
      var node = this.diagram.findNodeForKey(this.getFocusPerson());
      if (node == null) {
        node = this.diagram.findNodeForKey(this.root);
      }
      if (node != null) {
        this.diagram.commandHandler.scrollToPart(node);
        this.diagram.select(node);
      }
    }    
    return (
          <ReactDiagram
            ref={this.diagramRef}
            divClassName='diagram-component'
            initDiagram={() => this.diagram}
            nodeDataArray={this.props.nodeDataArray}
            linkDataArray={this.props.linkDataArray}
            modelData={this.props.modelData}
            onModelChange={this.props.onModelChange}
            skipsDiagramUpdate={this.props.skipsDiagramUpdate}
          />
    );
  }
}

// optional parameter passed to <ReactDiagram onModelChange = {handleModelChange}>
// called whenever model is changed

// class encapsulating the tree initialisation and rendering
class GenogramTree extends React.Component {
    constructor(props) {
      super(props);
      let rawJSON = null;
      this.source = props.router.location.state ? props.router.location.state.source : null;
      if (this.source) {
        rawJSON = props.router.location.state.relations;
        this.handleModelChange = this.handleModelChange.bind(this);
        this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
        this.closePopUp = this.closePopUp.bind(this);
        this.handleStatsClick = this.handleStatsClick.bind(this);
        this.handlePopupExtend = this.handlePopupExtend.bind(this);
        this.getAllPersons = this.getAllPersons.bind(this);
        this.setFocusPerson = this.setFocusPerson.bind(this);
        this.getFocusPerson = this.getFocusPerson.bind(this);
        this.requests = this.props.requests;
        if (rawJSON) {
          this.isLoading = false;
        } else {
          this.isLoading = true;
        }
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
          showFilters: false,
          from: '',
          to: '',
          family: '',
          filters: new FilterModel(true),
          showBtns: true,
          recentre: false,
          newDataAvailable: false,
          newData: null
        };
        this.componentRef = React.createRef();
      }
    }

    // Returns map of nodes for persons in tree
    getAllPersons() {
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

    closePopUp() {
      this.setState({
        isPopped: false
      })
    }

    handleModelChange(changes) {
        console.log('GoJS model changed!');
    }

    handleDiagramEvent(event) {
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

    integrateKinshipIntorelationJSON(kinshipJson, relationJSON) {
      for (const key of Object.keys(kinshipJson)) {
          const kinshipStr = kinshipJson[key].map((arr) => {
              arr.reverse();
              return arr.join(' of the ');
          }).join('; ');

          console.assert(relationJSON.items[key]);
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

    // If id is provided, we search this id. Otherwise it is a JSON provided by the user
    async fetchRelations(id, depth, fromCache = false, checkCache = false) {
      var relationJSON;
      depth = 2; // TODO: Remove later
      if (id == null || id === undefined) {
        relationJSON = this.state.originalJSON;
      } else if (fromCache) {
        relationJSON = await this.requests.relationsDb({
          id: id, depth: depth,
          visitedItems: this.state.originalJSON ? Object.keys(this.state.originalJSON.items) : []}
          );
        console.log("Data fetched from cache!");
      } else  {
        relationJSON = await this.requests.relations({
          id: id, depth: depth,
          visitedItems: this.state.originalJSON ? Object.keys(this.state.originalJSON.items) : []}
          );
        console.log("Data fetched from WikiData!");
      }

      if (!fromCache && checkCache && this.state.originalJSON) {
        let oldItems = Object.keys(this.state.originalJSON.items);
        let newItems = Object.keys(relationJSON.items);
        if (id === null || id === this.state.root) {
          if (oldItems.length !== newItems.length) {
            this.setState({
              newDataAvailable: true,
              newData: relationJSON
            });
          }
        }
        return;
      } else if (fromCache && checkCache && Object.keys(relationJSON.relations).length == 0) {
        return;
      }
      this.loadRelations(relationJSON, id)
    }

    loadRelations(relationJSON, id) {
      console.log("Loading relations!");
      // Add reciprocal relations.
      for (const [key, relations] of Object.entries(relationJSON.relations)) {
        for (const relation of relations) {
          if (relation.type === 'spouse') {
            if (!relationJSON.relations[relation.item1Id]) {
              relationJSON.relations[relation.item1Id] = [{item1Id: key, item2Id: relation.item1Id, type: 'spouse', typeId: 'WD-P26'}];
            } else if (!relationJSON.relations[relation.item1Id].some((r) => r.type === 'spouse' && r.item1Id === key)) {
              relationJSON.relations[relation.item1Id].push({item1Id: key, item2Id: relation.item1Id, type: 'spouse', typeId: 'WD-P26'});
            }
          } else if (relation.type === 'father' || relation.type === 'mother') {
            if (!relationJSON.relations[relation.item1Id]) {
              relationJSON.relations[relation.item1Id] = [{item1Id: key, item2Id: relation.item1Id, type: 'child', typeId: 'WD-P40'}];
            } else if (!relationJSON.relations[relation.item1Id].some((r) => (r.type === 'child') && r.item1Id === key)) {
              relationJSON.relations[relation.item1Id].push({item1Id: key, item2Id: relation.item1Id, type: 'child', typeId: 'WD-P40'});
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
                relationJSON.relations[relation.item1Id] = [{item1Id: key, item2Id: relation.item1Id, type: 'father', typeId: 'WD-P22'}];
              } else if (gender === 'female') {
                relationJSON.relations[relation.item1Id] = [{item1Id: key, item2Id: relation.item1Id, type: 'mother', typeId: 'WD-P25'}];
              }
            } else if (!relationJSON.relations[relation.item1Id].some((r) => (r.type === 'father' || r.type === 'mother') && r.item1Id === key)) {
              if (gender === 'male') {
                relationJSON.relations[relation.item1Id].push({item1Id: key, item2Id: relation.item1Id, type: 'father', typeId: 'WD-P22'});
              } else if (gender === 'female') {
                relationJSON.relations[relation.item1Id].push({item1Id: key, item2Id: relation.item1Id, type: 'mother', typeId: 'WD-P25'});
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

    applyFilterAndDrawTree() {
      // Get filter options
      // set up id map for getting attributes later
      for (let x of Object.keys(this.state.originalJSON.items)) {
          let people = this.state.originalJSON.items[x];
          for(let f of people.additionalProperties.filter((p) => p.name == 'family').map((p) => p.value)) {
            this.state.filters.allFamilies.add(f);
          }
      }
      // Use filter
      const filters = this.state.filters;
      var filteredJSON = { targets: this.state.originalJSON.targets };
      if (filters.bloodline || filters.families.size !== 0) {
        let visited = new go.Set();
        visited.add(this.state.root);
        if (filters.bloodline) {
          console.log('血胤');
          var frontier = [this.state.root];
          var descendants = [];

          while (frontier.length > 0 || descendants.length > 0) {
            var cur = frontier.shift();
            if (cur) {
              if (this.state.originalJSON.relations[cur]) {
                var newElems = this.state.originalJSON.relations[cur]
                    .filter((r) => r.type !== 'spouse' && !visited.contains(r.item1Id));
                var newFrontier = newElems.filter((r) => r.type !== 'child').map((r) => r.item1Id);
                var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                visited.addAll(newElems.map((r) => r.item1Id));
                frontier.push(...newFrontier);
                descendants.push(...newDescendants);
              }
            } else {
              cur = descendants.shift();
              if (this.state.originalJSON.relations[cur]) {
                var newElems = this.state.originalJSON.relations[cur]
                    .filter((r) => r.type !== 'spouse' && !visited.contains(r.item1Id));
                var newDescendants = newElems.filter((r) => r.type === 'child').map((r) => r.item1Id);
                visited.addAll(newElems.map((r) => r.item1Id));
                descendants.push(...newDescendants);
              }
            }
          }
        } else {
          visited.addAll(Object.keys(this.state.originalJSON.items));
        }
        if (filters.families.size !== 0) {
          visited = visited.filter((v) => 
              this.state.originalJSON.items[v].additionalProperties.filter((p) => p.name == 'family')
                  .map((p) => p.value).some((f) => filters.families.has(f)));
        }

        // Add outliers
        let outlierVisited = (new go.Set()).addAll(visited);
        var frontier = (new go.Set()).addAll(visited);
        while (outlierVisited.size > 0 && frontier.size > 0) {
          let outlierParents = new go.Set();
          let outlierSpouses = new go.Set();
          let remover = new go.Set();
          frontier.each((v) => {
            if (this.state.originalJSON.relations[v]) {
              var newElems = this.state.originalJSON.relations[v]
                  .filter((r) => (r.type !== 'child') && !visited.contains(r.item1Id));
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
          // console.log(outlierVisited.toArray().map((i) => this.state.originalJSON.items[i].name));
          frontier.addAll(outlierVisited);
          visited.addAll(outlierVisited);
        }

        var filteredJSON = { targets: this.state.originalJSON.targets, items: {}, relations: {} };
        visited.each((v) => {
          filteredJSON.items[v] = this.state.originalJSON.items[v];
          if (this.state.originalJSON.relations[v]) {
            filteredJSON.relations[v] = this.state.originalJSON.relations[v].filter((r) => visited.contains(r.item1Id));
          }
        });
        this.state.relationJSON = filteredJSON;
      } else {
        this.state.relationJSON = JSON.parse(JSON.stringify(this.state.originalJSON));
      }
    }

    async fetchKinships(id, relationJSON) {
      const kinshipJSON = await this.requests.relationCalc({start: id, relations: Object.values(relationJSON.relations).flat()});
      const newrelationJSON = this.integrateKinshipIntorelationJSON(kinshipJSON, relationJSON);
      this.setState({
          kinshipJSON: kinshipJSON,
          originalJSON: newrelationJSON
      });
    }

    // Merge two relational JSONs, modifying the old one.
    mergeRelations(oldRel, newRel) {
      oldRel.items = {...oldRel.items, ...newRel.items};

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
      await this.fetchRelations(this.state.personInfo, 2);
  }

  componentDidMount() {
    document.addEventListener('keydown', (event) => {
      if (event.key === ' ' && this.state && this.state.relationJSON != null) {
        event.preventDefault();
        this.setState({ showBtns: !this.state.showBtns, isUpdated: false, isLoading: false })
            }
    });
  }

  // renders ReactDiagram
  render() {
    if (this.source == null) {
      alert('Invalid URL!');
      return <div className='toolbar'>
      <Link to={'/'} className='blue-button'>
        <BiHomeAlt size={30}/>
      </Link>
  </div>;
    }

    if (this.state.relationJSON == null) {
      Promise.allSettled([
        this.fetchRelations(this.source, 3, true, true), 
        this.fetchRelations(this.source, 3, false, true)]
        );
      
      return (
          <div>
              <div className='toolbar'>
                  <Link to={'/'} className='blue-button'>
                  <BiHomeAlt size={30}/>
                  </Link>
              </div>
              <div className='first-time-loading'>
                  <ClipLoader
                      className='spinner'
                      color='#0000ff'
                      cssOverride={{
                          display: 'block',
                          margin: '0 auto',
                      }}
                      size={75}
                  />
              </div>
          </div>
      );
    }

    var updateDiagram = false;
    if (this.state.isUpdated) {
      this.state.isUpdated = false;
      this.applyFilterAndDrawTree();
      this.relations = transform(this.state.relationJSON);
      updateDiagram = true;
      this.state.isLoading = false;
    }
    var recentre = false;
    if (this.state.recentre) {
      recentre = true;
      this.state.recentre = false;
    }
    this.personMap = getPersonMap(Object.values(this.state.originalJSON.items));

    return(
        <div className='tree-box'>
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
                      // onExtend={() => null}
                      onExtend={this.handlePopupExtend}
                      allowExtend={this.props.allowExtend}
                  >
                  </PopupInfo>
                </div>
                : ''
          }
          {
            this.state.showFilters &&
            <Sidebar
              filters={this.state.filters}
              // yearFromChange={() => {}}
              // yearToChange={() => {}}
              familyChange={e => {
                this.setState({
                  family: e.target.value,
                  isUpdated: true
                });
              }}
              onChange={() => this.setState({isUpdated: true, isLoading: true})}
              onPersonSelection={(_, v) => this.setFocusPerson(v.key)}
              getAllPersons={this.getAllPersons}
              getFocusPerson={this.getFocusPerson}
            />
          }
          {
              this.state.showBtns &&
              <button className='show-filters-button' onClick={() => { 
                this.setState({
                  showFilters: !this.state.showFilters
                });
               }}>
                  <AiFillFilter size={50}/>                     
              </button>
          }
          {
              this.state.newDataAvailable &&
              <Button className="show-full-data-button" variant="secondary" size="lg" onClick={() => {
                console.log("Load Full Data!");
                this.loadRelations(this.state.newData, this.state.newData.targets[0].id);
                this.setState({
                  newDataAvailable: false
                });
              }}>Load Full Data</Button>
          }

          <DiagramWrapper
              updateDiagram={updateDiagram}
              recentre={recentre}
              editCount={this.props.editCount}
              nodeDataArray={this.relations}
              onModelChange={this.handleModelChange}
              onDiagramEvent={this.handleDiagramEvent}
              yearFrom={this.props.from}
              yearTo={this.props.to}
              ref={this.componentRef}
              root={this.state.root}
              getFocusPerson={this.getFocusPerson}
          />
          {this.state.showBtns &&
          <div className='toolbar'>
              <Link to={'/'} className='blue-button'>
                <BiHomeAlt size={30}/>
              </Link>
            <button className='blue-button'
                    id='svgButton'
                //     onClick={() => exportComponentAsPNG(
                // this.componentRef,
                // {fileName: 'family-tree'})}
            >
              Export as SVG
            </button>
            <button className='blue-button' onClick={() => downloadJsonFile(this.state.originalJSON)}>
              Export as JSON
            </button>
            <button className='blue-button' onClick={() => {
              this.setState((prevState) => ({
                showStats: !prevState.showStats
              }));
            }}>
              Show stats
            </button>
          </div>
          }
          {
              this.state.isLoading &&
              <div className='loading-bar'>
                  <ClipLoader
                      className={
                      'spinner'
                      }
                      color='#0000ff'
                      cssOverride={{
                          display: 'block',
                          margin: '0 auto',
                      }}
                      size={40}
                  />
                  <label>Updating tree...</label>
              </div>
          }
          {
            this.state.showStats &&
            <EscapeCloseable className='popup'>
              <StatsPanel data={this.state.relationJSON} onClick={this.handleStatsClick} />
            </EscapeCloseable>
          }
        </div>
    );
  }
  // initialises tree (in theory should only be called once, diagram should be .clear() and then data updated for re-initialisation)
  // see https://gojs.net/latest/intro/react.html

  // majority of code below is from https://gojs.net/latest/samples/genogram.html


}

  class GenogramLayout extends go.LayeredDigraphLayout {
    constructor() {
      super();
      this.initializeOption = go.LayeredDigraphLayout.InitDepthFirstIn;
      this.spouseSpacing = 10;  // minimum space between spouses
    }

    makeNetwork(coll) {
      // generate LayoutEdges for each parent-child Link
      const net = this.createNetwork();
      if (coll instanceof go.Diagram) {
        this.add(net, coll.nodes, true);
        this.add(net, coll.links, true);
      } else if (coll instanceof go.Group) {
        this.add(net, coll.memberParts, false);
      } else if (coll.iterator) {
        this.add(net, coll.iterator, false);
      }
      return net;
    }

    // internal method for creating LayeredDigraphNetwork where husband/wife pairs are represented
    // by a single LayeredDigraphVertex corresponding to the label Node on the marriage Link
    add(net, coll, nonmemberonly) {
      const horiz = this.direction === 0.0 || this.direction === 180.0;
      const multiSpousePeople = new go.Set();
      const couples = new go.Set();
      // consider all Nodes in the given collection
      const it = coll.iterator;
      while (it.next()) {
        const node = it.value;
        if (!(node instanceof go.Node)) continue;
        if (!node.isLayoutPositioned || !node.isVisible()) continue;
        if (nonmemberonly && node.containingGroup !== null) continue;
        if (node.isLinkLabel) {
        // get Haschild Link
        const link = node.labeledLink;
          const spouseA = link.fromNode;
          const spouseB = link.toNode;
          const vertex = net.addNode(node);
          // now define the vertex size to be big enough to hold both spouses
          if (horiz) {
            vertex.height = spouseA.actualBounds.height + this.spouseSpacing + spouseB.actualBounds.height;
            vertex.width = Math.max(spouseA.actualBounds.width, spouseB.actualBounds.width);
            vertex.focus = new go.Point(vertex.width / 2, spouseA.actualBounds.height + this.spouseSpacing / 2);
          } else {
            vertex.width = spouseA.actualBounds.width + this.spouseSpacing + spouseB.actualBounds.width;
            vertex.height = Math.max(spouseA.actualBounds.height, spouseB.actualBounds.height);
            vertex.focus = new go.Point(spouseA.actualBounds.width + this.spouseSpacing / 2, vertex.height / 2);
          }
        } else {
          // don't add a vertex for any married person!
          // instead, code above adds label node for marriage link
          // assume a marriage Link has a label Node
          let marriages = 0;
          node.linksConnected.each(l => {
            if (l.isLabeledLink) marriages++;
          });
          if (marriages === 0) {
            net.addNode(node);
          } else if (marriages > 1) {
            multiSpousePeople.add(node);
          }
        }
      }

      // now do all Links
      it.reset();
      while (it.next()) {
        const link = it.value;
        if (!(link instanceof go.Link)) continue;
        if (!link.isLayoutPositioned || !link.isVisible()) continue;
        if (nonmemberonly && link.containingGroup !== null) continue;
        // if it'gender a parent-child link, add a LayoutEdge for it
        if (!link.isLabeledLink) {
          const parent = net.findVertex(link.fromNode);  // should be a label node
          const child = net.findVertex(link.toNode);
          if (child !== null) {  // an unmarried child
            net.linkVertexes(parent, child, link);
          } else {  // a married child
            link.toNode.linksConnected.each(l => {
              if (!l.isLabeledLink) return;  // if it has no label node, it'gender a parent-child link
              // found the Marriage Link, now get its label Node
              const mlab = l.labelNodes.first();
              // parent-child link should connect with the label node,
              // so the LayoutEdge should connect with the LayoutVertex representing the label node
              const mlabvert = net.findVertex(mlab);
              if (mlabvert !== null) {
                net.linkVertexes(parent, mlabvert, link);
              }
            });
          }
        }
      }

      while (multiSpousePeople.count > 0) {
        // find all collections of people that are indirectly married to each other
        const node = multiSpousePeople.first();
        const cohort = new go.Set();
        this.extendCohort(cohort, node);
        // then encourage them all to be the same generation by connecting them all with a common vertex
        const dummyvert = net.createVertex();
        net.addVertex(dummyvert);
        const marriages = new go.Set();
        cohort.each(name => {
          name.linksConnected.each(l => {
            marriages.add(l);
          })
        });
        marriages.each(link => {
          // find the vertex for the marriage link (i.e. for the label node)
          const mlab = link.labelNodes.first()
          const v = net.findVertex(mlab);
          if (v !== null) {
            net.linkVertexes(dummyvert, v, null);
          }
        });
        // done with these people, now see if there are any other multiple-married people
        multiSpousePeople.removeAll(cohort);
      }
    }

    // collect all of the people indirectly married with a person
    extendCohort(coll, node) {
      if (coll.has(node)) return;
      coll.add(node);
      node.linksConnected.each(l => {
        if (l.isLabeledLink) {  // if it'gender a marriage link, continue with both spouses
          this.extendCohort(coll, l.fromNode);
          this.extendCohort(coll, l.toNode);
        }
      });
    }

    assignLayers() {
      super.assignLayers();
      const horiz = this.direction === 0.0 || this.direction === 180.0;
      // for every vertex, record the maximum vertex width or height for the vertex'gender layer
      const maxsizes = [];
      this.network.vertexes.each(v => {
        const lay = v.layer;
        let max = maxsizes[lay];
        if (max === undefined) max = 0;
        const sz = (horiz ? v.width : v.height);
        if (sz > max) maxsizes[lay] = sz;
      });
      // now make sure every vertex has the maximum width or height according to which layer it is in,
      // and aligned on the left (if horizontal) or the top (if vertical)
      this.network.vertexes.each(v => {
        const lay = v.layer;
        const max = maxsizes[lay];
        if (horiz) {
          v.focus = new go.Point(0, v.height / 2);
          v.width = max;
        } else {
          v.focus = new go.Point(v.width / 2, 0);
          v.height = max;
        }
      });
      // from now on, the LayeredDigraphLayout will think that the Node is bigger than it really is
      // (other than the ones that are the widest or tallest in their respective layer).
    }

    commitLinks() {
      super.commitLinks();
      var splitNode = this.splitNode;
      var mergeNode = this.mergeNode;
      if (splitNode === null || mergeNode === null || this.network === null) return;
      // set default link spots based on this.angle
      var it = this.network.edges.iterator;
      while (it.next()) {
        var e = it.value;
        var link = e.link;
        if (!link) continue;
        if (this.angle === 0) {
          if (this.setsPortSpot) link.fromSpot = go.Spot.Right;
          if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
        } else if (this.angle === 90) {
          if (this.setsPortSpot) link.fromSpot = go.Spot.Bottom;
          if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
        }
      }
      // Make sure links coming into and going out of a Split node come in the correct way
      if (splitNode) {
        // Handle links coming into the Split node
        var cond = this.isConditional(splitNode);
        var swtch = this.isSwitch(splitNode);
        // Handle links going out of the Split node
        var first = true;  // handle "If" nodes specially
        var lit = splitNode.findLinksOutOf();
        while (lit.next()) {
          var link = lit.value;
          if (this.angle === 0) {
            if (this.setsPortSpot) link.fromSpot = cond ? (first ? go.Spot.Top : go.Spot.Bottom) : (swtch ? go.Spot.RightSide : go.Spot.Right);
            if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
          } else if (this.angle === 90) {
            if (this.setsPortSpot) link.fromSpot = cond ? (first ? go.Spot.Left : go.Spot.Right) : (swtch ? go.Spot.BottomSide : go.Spot.Bottom);
            if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
          }
          first = false;
        }
      }
      if (mergeNode) {
        // Handle links going into the Merge node
        var it = mergeNode.findLinksInto();
        while (it.next()) {
          var link = it.value;
          if (!this.isSplit(link.fromNode)) {  // if link connects Split with Merge directly, only set fromSpot once
            if (this.angle === 0) {
              if (this.setsPortSpot) link.fromSpot = go.Spot.Right;
              if (this.setsChildPortSpot) link.toSpot = go.Spot.Left;
            } else if (this.angle === 90) {
              if (this.setsPortSpot) link.fromSpot = go.Spot.Bottom;
              if (this.setsChildPortSpot) link.toSpot = go.Spot.Top;
            }
          }
          if (!link.isOrthogonal) continue;
          // have all of the links coming into the Merge node have segments
          // that share a common X (or if angle==90, Y) coordinate
          link.updateRoute();
          if (link.pointsCount >= 6) {
            var pts = link.points.copy();
            var p2 = pts.elt(pts.length - 4);
            var p3 = pts.elt(pts.length - 3);
            if (this.angle === 0 && p2.x === p3.x) {
              var x = mergeNode.position.x - this.layerSpacing / 2;
              pts.setElt(pts.length - 4, new go.Point(x, p2.y));
              pts.setElt(pts.length - 3, new go.Point(x, p3.y));
            } else if (this.angle === 90 && p2.y === p3.y) {
              var y = mergeNode.position.y - this.layerSpacing / 2;
              pts.setElt(pts.length - 4, new go.Point(p2.x, y));
              pts.setElt(pts.length - 3, new go.Point(p3.x, y));
            }
            link.points = pts;
          }
        }
        // handle links coming out of the Merge node, looping back left/up
        var it = mergeNode.findLinksOutOf();
        while (it.next()) {
          var link = it.value;
          // if connects internal with external node, it isn't a loop-back link
          if (link.toNode.containingGroup !== mergeNode.containingGroup) continue;
          if (this.angle === 0) {
            if (this.setsPortSpot) link.fromSpot = go.Spot.TopBottomSides;
            if (this.setsChildPortSpot) link.toSpot = go.Spot.TopBottomSides;
          } else if (this.angle === 90) {
            if (this.setsPortSpot) link.fromSpot = go.Spot.LeftRightSides;
            if (this.setsChildPortSpot) link.toSpot = go.Spot.LeftRightSides;
          }
          link.routing = go.Link.AvoidsNodes;
        }
      }
    }

    commitNodes() {
      super.commitNodes();
      const horiz = this.direction === 0.0 || this.direction === 180.0;
      // position regular nodes
      this.network.vertexes.each(v => {
        if (v.node !== null && !v.node.isLinkLabel) {
          v.node.moveTo(v.x, v.y);
        }
      });
      // position the spouses of each marriage vertex
      this.network.vertexes.each(v => {
        if (v.node === null) return;
        if (!v.node.isLinkLabel) return;
        const labnode = v.node;
        const lablink = labnode.labeledLink;
        // In case the spouses are not actually moved, we need to have the marriage link
        // position the label node, because LayoutVertex.commit() was called above on these vertexes.
        // Alternatively we could override LayoutVetex.commit to be a no-op for label node vertexes.
        lablink.invalidateRoute();
        let spouseA = lablink.fromNode;
        let spouseB = lablink.toNode;
        if (spouseA.opacity > 0 && spouseB.opacity > 0) {
          // prefer fathers on the left, mothers on the right
          if (spouseA.data.gender === 'female') {  // sex is female
            const temp = spouseA;
            spouseA = spouseB;
            spouseB = temp;
          }
          // see if the parents are on the desired sides, to avoid a link crossing
          const aParentsNode = this.findParentsMarriageLabelNode(spouseA);
          const bParentsNode = this.findParentsMarriageLabelNode(spouseB);
          if (aParentsNode !== null && bParentsNode !== null &&
              (horiz
                ? aParentsNode.position.y > bParentsNode.position.y
                : aParentsNode.position.x > bParentsNode.position.x)) {
            // swap the spouses
            const temp = spouseA;
            spouseA = spouseB;
            spouseB = temp;
          }
          spouseA.moveTo(v.x, v.y);
          if (horiz) {
            spouseB.moveTo(v.x, v.y + spouseA.actualBounds.height + this.spouseSpacing);
          } else {
            spouseB.moveTo(v.x + spouseA.actualBounds.width + this.spouseSpacing, v.y);
          }
        } else if (spouseA.opacity === 0) {
          const pos = horiz
            ? new go.Point(v.x, v.centerY - spouseB.actualBounds.height / 2)
            : new go.Point(v.centerX - spouseB.actualBounds.width / 2, v.y);
          spouseB.move(pos);
          if (horiz) pos.y++; else pos.x++;
          spouseA.move(pos);
        } else if (spouseB.opacity === 0) {
          const pos = horiz
            ? new go.Point(v.x, v.centerY - spouseA.actualBounds.height / 2)
            : new go.Point(v.centerX - spouseA.actualBounds.width / 2, v.y);
          spouseA.move(pos);
          if (horiz) pos.y++; else pos.x++;
          spouseB.move(pos);
        }
        lablink.ensureBounds();
      });
      // position only-child nodes to be under the marriage label node
      this.network.vertexes.each(v => {
        if (v.node === null || v.node.linksConnected.count > 1) return;
        const mnode = this.findParentsMarriageLabelNode(v.node);
        if (mnode !== null && mnode.linksConnected.count === 1) {  // if only one child
          const mvert = this.network.findVertex(mnode);
          const newbnds = v.node.actualBounds.copy();
          if (horiz) {
            newbnds.y = mvert.centerY - v.node.actualBounds.height / 2;
          } else {
            newbnds.x = mvert.centerX - v.node.actualBounds.width / 2;
          }
          // see if there'gender any empty space at the horizontal mid-point in that layer
          const overlaps = this.diagram.findObjectsIn(newbnds, x => x.part, p => p !== v.node, true);
          if (overlaps.count === 0) {
            v.node.move(newbnds.position);
          }
        }
      });
    }

    findParentsMarriageLabelNode(node) {
      const it = node.findNodesInto();
      while (it.next()) {
        const name = it.value;
        if (name.isLinkLabel) return name;
      }
      return null;
    }
  }
  
  class ArcLink extends go.Link {
    rotate(x, y, rad) {
      return {
        x: x * Math.cos(rad) - y * Math.sin(rad),
        y: y * Math.cos(rad) + x * Math.sin(rad)
      };
    }

    findCircle(x1,  y1,  x2,  y2, x3, y3)
    {
        var x12 = (x1 - x2);
        var x13 = (x1 - x3);
    
        var y12 =( y1 - y2);
        var y13 = (y1 - y3);
    
        var y31 = (y3 - y1);
        var y21 = (y2 - y1);
    
        var x31 = (x3 - x1);
        var x21 = (x2 - x1);
    
        //x1^2 - x3^2
        var sx13 = Math.pow(x1, 2) - Math.pow(x3, 2);
    
        // y1^2 - y3^2
        var sy13 = Math.pow(y1, 2) - Math.pow(y3, 2);
    
        var sx21 = Math.pow(x2, 2) - Math.pow(x1, 2);
        var sy21 = Math.pow(y2, 2) - Math.pow(y1, 2);
    
        var f = ((sx13) * (x12)
                + (sy13) * (x12)
                + (sx21) * (x13)
                + (sy21) * (x13))
                / (2 * ((y31) * (x12) - (y21) * (x13)));
        var g = ((sx13) * (y12)
                + (sy13) * (y12)
                + (sx21) * (y13)
                + (sy21) * (y13))
                / (2 * ((x31) * (y12) - (x21) * (y13)));
    
        var c = -(Math.pow(x1, 2)) -
        Math.pow(y1, 2) - 2 * g * x1 - 2 * f * y1;
    
        // eqn of circle be
        // x^2 + y^2 + 2*g*x + 2*f*y + c = 0
        // where centre is (h = -g, k = -f) and radius r
        // as r^2 = h^2 + k^2 - c
        var h = -g;
        var k = -f;
        var sqr_of_r = h * h + k * k - c;
    
        // r is the radius
        var r = Math.sqrt(sqr_of_r);
        return {
          cX: h, cY: k, r: r
        };
    }

    computePoints() {
      var fromnode = this.fromNode;
      if (!fromnode) return false;
      var fromport = this.fromPort;
      var fromspot = this.computeSpot(true);
      var tonode = this.toNode;
      if (!tonode) return false;
      var toport = this.toPort;
      var tospot = this.computeSpot(false);
      var frompoint = this.getLinkPoint(fromnode, fromport, fromspot, true, true, tonode, toport);
      if (!frompoint.isReal()) return false;
      var topoint = this.getLinkPoint(tonode, toport, tospot, false, true, fromnode, fromport);
      if (!topoint.isReal()) return false;
    
      this.clearPoints();
      this.addPoint(frompoint);

      let fx = frompoint.x;
      let fy = frompoint.y;
      let tx = topoint.x;
      let ty = topoint.y;
      let slopeAngle = Math.atan2(ty - fy, tx - fx);
      let rotatedFromPoint = this.rotate(fx, fy, -slopeAngle);
      let rotatedToPoint = this.rotate(tx, ty, -slopeAngle);

      var dia = Math.sqrt((fx - tx) * (fx - tx) + (fy - ty) * (fy - ty));
      let height = Math.min(30, dia / 5);

      let midX = (rotatedFromPoint.x + rotatedToPoint.x) / 2;
      let midY = rotatedFromPoint.y + height * ((fx > tx) != (this.fromSpot === go.Spot.Bottom) ? 1 : -1);

      let circle = this.findCircle(rotatedFromPoint.x, rotatedFromPoint.y, rotatedToPoint.x, rotatedToPoint.y, midX, midY);
      let parametric = (t) => {
        return {
          x: circle.r * Math.cos(t) + circle.cX,
          y: circle.r * Math.sin(t) + circle.cY
        };
      };
      let startAngle = Math.atan2(rotatedFromPoint.y - circle.cY, rotatedFromPoint.x - circle.cX);
      let endAngle = Math.atan2(rotatedToPoint.y - circle.cY, rotatedToPoint.x - circle.cX);
      let increment = (endAngle - startAngle) / 10;
      for (var currentAngle = startAngle ; 
          startAngle < endAngle ? currentAngle <= endAngle : currentAngle >= endAngle ; 
          currentAngle += increment) {
            let parametricResult = parametric(currentAngle);
            let point = this.rotate(parametricResult.x, parametricResult.y, slopeAngle);
            this.addPointAt(point.x, point.y);
          }
      this.addPoint(topoint);
      this.updateTargetBindings();
      return true;
    }
  }

export default withRouter(GenogramTree);
