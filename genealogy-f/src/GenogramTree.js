import {FamilyTree} from './components/family-tree/FamilyTree';
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
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
import { Link } from "react-router-dom";
import './components/shared.css';
import _ from 'lodash';

import {BiHomeAlt} from "react-icons/bi"
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

  const target = idPerson.get(id);
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
  const target = idPerson.get(id);
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

// ^^^^^^ SEE ABOVE transformed format helper function to transfrom JSON into goJS nodeDataArray format.
function transformNewDoesNotWork(data, yearFrom, yearTo, familyName) {
  const res = structuredClone(data);
  res.targets = oldRel.targets;
  const idItemMap = new Map();
  for (const item of oldRel.items) {
    idItemMap.set(item.id, item);
  }
  for (const item of newRel.items) {
    if (!idItemMap.has(item.id)) {
      idItemMap.set(item.id, item);
    }
  }
  res.items = Array.from(idItemMap.values());
  return res;
}

function transform(data, yearFrom, yearTo, familyName) {
  relMap = new Map();

  let target = data.targets[0]; // The root

  // TODO: Back-end return a map of items
  let idPerson = new Map();
  let people = data.items;
  people.push(target);
  let targetId = target.id;
  // set up id map for getting attributes later
  idPerson.set(targetId, target);
  for (let x of data.items) {
      idPerson.set(x.id, x);
  }
  // END TODO

  for (let relation of data.relations) {
    var key = relation['item2Id'];
    var sourceItem = idPerson.get(key);
    if (sourceItem === undefined) {
      console.log('------- ERROR -------- key :' + key + 'not found in data.items');
      continue;
    }

    // if (applyDateOfBirthFilter(key, yearFrom, yearTo, idPerson) && applyFamilyFilter(key, familyName, idPerson)) {
    //   // continue;
    //   console.log("here")
    // }

    // split select target into their additional properties (general, not predetermined)
    // need a filter here depending on which type of tree we are using.
    var addProps = sourceItem.additionalProperties;

    var motherfuckers = {};

    // create node for item1 key ('from' key)
    if (relMap.has(key)) {
        motherfuckers = relMap.get(key);
    } else {
      var genderKey = addProps.filter(p => p.name == 'gender')[0]
      var gender = genderKey ? genderKey.value : undefined
      motherfuckers = {
        key: sourceItem.id,
        name: sourceItem.name,
        gender: gender,
        spouse: []
      };
    }

    // check each relationship if so update record accordingly
    if (relation.type === 'child') {
      // motherfuckers.child;
      // continue;
    }
    if (relation.type === 'mother') {
        motherfuckers.mother = relation.item1Id;
    }
    if (relation.type === 'father') {
        motherfuckers.father = relation.item1Id;
    }
    if (relation.type === 'spouse') {
      motherfuckers.spouse.push(relation.item1Id);
    }
    relMap.set(key, motherfuckers);
    var targetKey = relation['item1Id'];
    var targetItem = idPerson.get(targetKey);
    if (!relMap.has(targetKey)) {
      var genderKey = targetItem.additionalProperties.filter(p => p.name == 'gender')[0]
      var gender = genderKey ? genderKey.value : undefined
      relMap.set(targetKey, {
        key: targetItem.id,
        name: targetItem.name,
        gender: gender,
        spouse: []
      });
    }
  }

  var newOutput = [];

  // apply filters (add opacity to non-filtered)
  for (let key of relMap.keys()) {
    let r = relMap.get(key);
    if (applyDateOfBirthFilter(key, yearFrom, yearTo, idPerson) && applyFamilyFilter(key, familyName, idPerson)) {
      r.opacity = r.opacity == null ? '0.9' : r.opacity;
    } else {
      r.opacity = '0.2';
      relMap.delete(key);
    }
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
    let newF = {key: "_" + mfs.mother, name: 'unknown', gender: 'male', opacity: '0.2'};
    // marry parent to unknown and set child parent to unknown
    newF.spouse = [mfs.mother];
    mfs.father = newF.key;
    relMap.set(newF.key, newF);
    relMap.set(mfs.key, mfs);
  }

  // case of unknown mother - temporarily replace with 'unknown' node
  if (!mfs.mother && mfs.father) {
    let newM = {key: "_" + mfs.father, name: 'unknown', gender: 'female', opacity: '0.2'};
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
    this.state = { diagram: undefined, isFirstRender: true };
    this.personInfo = props.personInfo
    this.init();
  }

  componentDidMount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener('ObjectSingleClicked', this.props.onDiagramEvent);
    }
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
          initialAutoScale: go.Diagram.Uniform,
          'undoManager.isEnabled': false,
          // when a node is selected, draw a big yellow circle behind it
          nodeSelectionAdornmentTemplate:
            $(go.Adornment, 'Auto',
              { layerName: 'Grid' },  // the predefined layer that is behind everything else
              $(go.Shape, 'Circle', {fill: '#c1cee3', stroke: null }),
              $(go.Placeholder, { margin: 0 })
            ),
          layout:  // use a custom layout, defined below
            $(GenogramLayout, { direction: 90, layerSpacing: 50, columnSpacing: 0 })
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
            routing: go.Link.Orthogonal, corner: 0,
            layerName: 'Background', selectable: false,
          },
          $(go.Shape, { stroke: '#424242', strokeWidth: 1}, new go.Binding('opacity', 'opacity'))
        );

      this.diagram.linkTemplateMap.add('Marriage',  // for marriage relationships
        $(SemicircleLink,
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
      $(go.Link,
        {
          routing: go.Link.Orthogonal,
          fromSpot: go.Spot.Bottom,
          toSpot: go.Spot.Bottom,
          selectable: false,
          layerName: 'Background',
          toEndSegmentLength: 30,
          fromEndSegmentLength: 30
        },
        $(go.Shape, { strokeWidth: 1, stroke: '#ff0000' /* red */}, new go.Binding('opacity', 'opacity'))
      ));

    return this.diagram;
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
          // add a label node for the marriage link
          const mlab = { gender: 'LinkLabel' };
          model.addNodeData(mlab);
          this.diagram.model.addLinkData({ from: father, to: mother, labelKeys: [mlab.key], category: 'hasChild' });
          link = this.findHasChild(diagram, father, mother);
        }

        // link = this.findMarriage(diagram, father, mother);

        // if (link == null) continue;
        
        const mdata = link.data;
        if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) {
          console.log("Should not happen");
          continue;
        } 
        const mlabkey = mdata.labelKeys[0];

        // console.log('MLAB KEY: ' + mlabkey);
        const cdata = { from: mlabkey, to: key };
        this.diagram.model.addLinkData(cdata);
      }
    }
  }

  render() {
    console.log('UPDATE: ' + this.props.updateDiagram);
    if (this.state.isFirstRender || this.props.updateDiagram) {
      this.state.isFirstRender = false;

      // From graph expand
      if (this.personInfo !== '') {
        this.setupDiagram(this.props.nodeDataArray, this.personInfo);
      }
      else {
        this.setupDiagram(this.props.nodeDataArray, this.props.nodeDataArray[0].key);
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
      this.source = props.router.location.state ? props.router.location.state.source : null;
      if (this.source) {
        this.rawJSON = props.router.location.state.relations;
        this.handleModelChange = this.handleModelChange.bind(this);
        this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
        this.closePopUp = this.closePopUp.bind(this);
        this.handleStatsClick = this.handleStatsClick.bind(this);
        this.requests = this.props.requests;
        if (this.rawJSON) {
          this.relations = transform(this.rawJSON, this.state.from, this.state.to, this.state.family);
          this.personMap = getPersonMap(this.rawJSON.items);
          this.isLoading = false;
        } else {
          this.isLoading = true;
        }
        this.state = {
          isUpdated: false,
          isLoading: this.isLoading,
          originalJSON: this.rawJSON,
          relationJSON: this.rawJSON,
          kinshipJSON: null,
          personInfo: null,
          isPopped: false,
          showStats: false,
          from: '',
          to: '',
          family: '',
          isPopped: false,
          filters: new FilterModel()
        };
        this.componentRef = React.createRef();
      }
    }

    closePopUp() {
      this.setState({
        isPopped: false
      })
    }

    handleModelChange(changes) {
        console.log('GoJS model changed!');
    }

    handleDiagramEvent (event) {
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
      const idItemMap = new Map();
      for (const item of relationJSON.items) {
          idItemMap.set(item.id, item);
      }
      for (const key of Object.keys(kinshipJson)) {
          const kinshipStr = kinshipJson[key].map((arr) => {
              arr.reverse();
              return arr.join(' of the ');
          }).join('; ');
          const property = {
              propertyId: 'PB-kinship',
              name: 'relation to the searched person',
              value: kinshipStr,
              valueHash: null,
          };
          // if (!idItemMap.has(key)) {
          //     console.log(key);
          // }
          console.assert(idItemMap.has(key));
          const item = idItemMap.get(key);
          const props = item.additionalProperties;
          props.push(property);
          item.additionalProperties = props;
          idItemMap.set(key, item);
      }
      const newItems = Array.from(idItemMap.values());
      const res = relationJSON;
      res.items = newItems;
      return res;
    }

    async fetchRelations(id) {
      const relationJSON = await this.requests.relations({id: id});
      if (this.state.originalJSON == null) {
        this.state.originalJSON = JSON.parse(JSON.stringify(relationJSON));
      }
      this.fetchKinships(id, this.state.originalJSON);

      // Use filter
      const filters = this.state.filters;

      const visited = new go.Set();
      if (filters.bloodline) {
        console.log("血胤");
        var frontier = [id];

        while (frontier.length > 0) {
          var cur = frontier.shift();
          var newElems = relationJSON.relations
              .filter((r) => r.item2Id === cur && r.type !== "spouse" && !visited.contains(r.item1Id))
              .map((r) => r.item1Id);
          visited.addAll(newElems);
          frontier.push(...newElems);
        }
      }

      relationJSON.items = relationJSON.items.filter((i) => visited.contains(i.id));
      relationJSON.relations = relationJSON.relations.filter((r) => visited.contains(r.item1Id) && visited.contains(r.item2Id))
      this.setState({
        isLoading: false,
        isUpdated: true,
        relationJSON: relationJSON,
      });
    }

    async fetchKinships(id, relationJSON) {
      const kinshipJSON = await this.requests.relationCalc({start: id, relations: relationJSON.relations});
      const newrelationJSON = this.integrateKinshipIntorelationJSON(kinshipJSON, relationJSON);
      this.setState({
          kinshipJSON: kinshipJSON,
          originalJSON: newrelationJSON,
      });
    }

    // renders ReactDiagram
    render() {
      if (this.source == null) {
        alert('Invalid URL!');
        return;
      }

      if (this.state.relationJSON == null) {
        this.fetchRelations(this.source);
        
        return (
          <div><ClipLoader
                          className={
                            'spinner'
                          }
                          color='#0000ff'
                          cssOverride={{
                              display: 'block',
                              margin: '0 auto',
                          }}
          size={75}/></div>
        );
      }

      var updateDiagram = false;
      if (this.state.isUpdated) {
        this.state.isUpdated = false;
        this.relations = transform(this.state.relationJSON, this.state.from, this.state.to, this.state.family);
        updateDiagram = true;
      }
      this.personMap = getPersonMap(this.state.originalJSON.items);

      return(
          <div className='tree-box'>
            {
              this.state.isPopped
                  ? <div className='popup'>
                    <PopupInfo
                        closePopUp={this.closePopUp}
                        info={this.personMap.get(this.state.personInfo)}
                        onNew={this.fetchRelations.bind(null, this.state.personInfo)}
                        onExtend={() => null}
                        // onExtend={this.props.onPopupExtend.bind(null, this.state.personInfo)}
                        allowExtend={this.props.allowExtend}
                    >
                    </PopupInfo>
                  </div>
                  : ''
            }

            <DiagramWrapper
                updateDiagram={updateDiagram}
                editCount={this.props.editCount}
                nodeDataArray={this.relations}
                onModelChange={this.handleModelChange}
                onDiagramEvent={this.handleDiagramEvent}
                yearFrom={this.props.from}
                yearTo={this.props.to}
                ref={this.componentRef}
                personInfo={this.state.personInfo} // TODO: from props directly?
            />

            <div className='toolbar'>
                <Link to={'/'} className='blue-button'>
                  <BiHomeAlt size={30}/>
                </Link>
              <button className='blue-button' onClick={() => exportComponentAsPNG(this.componentRef)}>
                Export as PNG
              </button>
              <button className='blue-button' onClick={() => downloadJsonFile(this.rawJSON)}>
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
      this.spouseSpacing = 5;  // minimum space between spouses
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
            if (l.category === 'hasChild') marriages++;
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
          console.log(link.category);
          if (link.category === 'hasChild') {
            // find the vertex for the marriage link (i.e. for the label node)
            const mlab = link.labelNodes.first()
            const v = net.findVertex(mlab);
            if (v !== null) {
              net.linkVertexes(dummyvert, v, null);
            }
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
        if (l.category === 'hasChild') {  // if it'gender a marriage link, continue with both spouses
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

    commitNodes() {
      super.commitNodes();
      const horiz = this.direction === 0.0 || this.direction === 180.0;
      // console.log(horiz);
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
  
  class SemicircleLink extends go.Link {
    makeGeometry() {
      var curviness = this.computeCurviness();
      if (curviness === 0) return super.makeGeometry();
  
      var fromport = this.fromPort;
      var toport = this.toPort;
      if (fromport === null || toport === null) return new Geometry(Geometry.Line);
  
      var fp = this.getPoint(0);
      var tp = this.getPoint(this.pointsCount - 1);
  
      var fx = fp.x;
      var fy = fp.y;
      var tx = tp.x;
      var ty = tp.y;
  
      var px = Math.min(fx, tx);
      var py = Math.min(fy, ty);
  
      fx -= px;
      fy -= py;
      tx -= px;
      ty -= py;
  
      var dia = Math.sqrt((fx - tx) * (fx - tx) + (fy - ty) * (fy - ty));
      let height = Math.min(30, dia / 5);
      let radius = (height * height + dia * dia / 4) / (2 * height);
      this.dia = dia;
      
      return new go.Geometry()
             .add(new go.PathFigure(fx, fy + (this.fromSpot === go.Spot.Bottom ? 0 : 10), false)
                  .add(new go.PathSegment(
                    go.PathSegment.SvgArc, 
                    tx, ty + (this.fromSpot === go.Spot.Bottom ? 0 : 10), radius, radius, 0, 0, (fx > tx) == (this.fromSpot === go.Spot.Bottom)
                    )));
    }
  }

export default withRouter(GenogramTree);
