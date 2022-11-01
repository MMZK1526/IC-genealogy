import {FamilyTree} from "./components/family-tree/FamilyTree";
import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React from "react";
import * as go from 'gojs';
import {ReactDiagram} from 'gojs-react';
import './App.css';
import PopupInfo from './components/popup-info/PopupInfo.js'
import './GenogramTree.css';
import { MdFolderShared, MdPadding } from "react-icons/md";

// helper function to convert "WD-Q13423" -> 13423
function toInt(str) {
    return Number(str.substring(4));
  }

// { key: 0, n: "Aaron", s: "M", m: -10, f: -11, ux: 1, a: ["C", "F", "K"] },
// { key: 1, n: "Alice", s: "F", m: -12, f: -13, a: ["B", "H", "K"] },
// n: name, s: sex, m: mother, f: father, ux: wife, vir: husband, a: attributes/markers

// should we apply filter before or after (or in between) tree generation
// yearFrom and yearTo passed in at start.



// comparing date using js inbuilt date
export function applyDateOfBirthFilter(id, dateFrom, dateTo, idPerson) {
  if (dateFrom == '' && dateTo == '') {
    return true;
  }

  // console.log(id);
  const target = idPerson.get(id);
  if (target == null) {return false;}
  const addProps = target.additionalProperties;
  // can we make this generic in the future
  const f = addProps.filter(p => p.name == "date of birth");
  // console.log(f);
  // console.log(f);
  // could be improved for large chain of unknown date of birth people.
  if (f[0] == null  || f[0].length == 0 || f[0].value == null) {
    const r = relMap.get(id);
    if (r.m == null || r.f == null) {
      return false;
    }
    const m = applyDateOfBirthFilter(unConvert(r.m), dateFrom, dateTo, idPerson)
    const f = applyDateOfBirthFilter(unConvert(r.f), dateFrom, dateTo, idPerson)
    // check if both parents are out of the date range, if so then assume unknown also outside, otherwise leave in.
    return m && f;
  }
  const date = (f[0].value).split("T");
  // console.log(date[0]);
  const d3 = new Date(date[0]);
  const d1 = dateFrom == '' ? new Date(-8640000000000000) : new Date(dateFrom);
  const d2 = dateTo == '' ? new Date("3000-01-01") : new Date(dateTo);
  // console.log("comparing " + d1 + "with " + d2 + "and " + d3);
  return d1 <= d3 && d3 <= d2;
}

// comparing family on string
export function applyFamilyFilter(id, familyName, idPerson) {
  console.log(familyName);
  if (familyName == '') {
    return true;
  }
  const target = idPerson.get(id);
  if (target == null) {return false;}
  const addProps = target.additionalProperties;
  // can we make this generic in the future
  const f = addProps.filter(p => p.name == "family");
  // console.log(f);
  // console.log(f);
  // could be improved for large chain of unknown date of birth people.
  if (f[0] == null  || f[0].length == 0 || f[0].value == null) {
    const r = relMap.get(id);
    if (r.m == null || r.f == null) {
      return false;
    }
    const m = applyFamilyFilter(unConvert(r.m), familyName, idPerson)
    const f = applyFamilyFilter(unConvert(r.f), familyName, idPerson)
    // check if both parents are out of the date range, if so then assume unknown also outside, otherwise leave in.
    return m && f;
  }
  console.log(f[0].value);
  // console.log("comparing " + d1 + "with " + d2 + "and " + d3);
  return f[0].value === familyName;
}

// global map from id of person to their attributes, used to change opacity for filtering in the goJs diagram.
var relMap = new Map();

// ^^^^^^ SEE ABOVE transformed format helper function to transfrom JSON into goJS nodeDataArray format.
export function transform(data, yearFrom, yearTo, familyName) {
  // check if already generated
  // tree still being regenrated can we improve on this.

  console.log(data);
  // data.people to be replaced with data.items in Mulang version
  let target = data.targets[0];
  let idPerson = new Map();
  let people = data.items;
  people.push(target);
  let targetId = target.id;
  idPerson.set(targetId, target);
  for (let x of data.items) {
      idPerson.set(x.id, x);
  }
  // if (relMap.size > 1) {
  //   for (let key of relMap.keys()) {
  //     let r = relMap.get(key);
  //     if (applyDateOfBirthFilter(key, yearFrom, yearTo, idPerson)) {
  //       r.opacity = "1.0";
  //     } else {
  //       r.opacity = "0.2";
  //     }
  //   }
  //   console.log(newOutput);
  //   return newOutput;
  // }
  // create a map from personId to (relation array of their mother, father and spouse )
  // console.log(data.relations);
  for (let relation of data.relations) {
      var key = relation['item2Id'];
      var target2 = idPerson.get(key);
      // check if relation ID exist in data.item, if not then discard (edge of search?)
      if (target2 === undefined) {
        console.log("------- ERROR -------- key :" + key + "not found in data.items");
      }
      // split select target into their additional properties (general, not predetermined)
      // need a filter here depending on which type of tree we are using.
      var addProps = target2.additionalProperties;
      var mfs = {};

      // create node for item1 key ("from" key)
      if (relMap.has(key)) {
          mfs = relMap.get(key);
      } else {
          mfs = {key: toInt(target2.id), n: target2.name, s: (addProps.filter(p => p.name == "gender"))[0].value};
      }
      // check each relationship if so update record accordingly
      if (relation.type === 'child') {
        continue;
      }
      if (relation.type === 'mother') {
          mfs.m = toInt(relation.item1Id);

      }
      if (relation.type === 'father') {
          mfs.f = toInt(relation.item1Id);
      }
      if (relation.type === 'spouse') {
        let spouseId = toInt(relation.item1Id);
        // if you already have a spouse listed, then prioritise lisitng a spouse who isnt already married to you. i.e conver to a -> b -> c -> d rather than a <-> b, c <-> d
              if ((addProps.filter(p => p.name == "gender"))[0].value == 'M') {
                relMap = updatePrevWife(mfs, relMap, idPerson);
                let newP = relMap.get(unConvert(spouseId));
                if (newP == null || (newP.vir == null || newP.vir != mfs.key)) {
                  console.log("NEW RELATION: " + mfs.key + " wife now pointing to " + toInt(relation.item1Id));
                  mfs.ux = spouseId
                }

              } else {
                relMap = updatePrevHusband(mfs, relMap, idPerson);
                let newP = relMap.get(unConvert(spouseId));
                if (newP == null || (newP.ux == null || newP.ux != mfs.key)) {
                  console.log("NEW RELATION: " + mfs.key + " husband now pointing to" + toInt(relation.item1Id));
                  mfs.vir = spouseId
                }
          }
                // console.log(mfs.key + "husband now pointing to " + mfs.vir);
        console.log(JSON.stringify(mfs));
    }
      relMap.set(key, mfs)
      relMap = createRelation(relation['item1Id'], idPerson, relMap);
  }
  // loop through keys (bug of 3 targets in people, otherwise can loop through them)
  // assumes both mother and father have to exist, (makes more sense)
  console.log("marrying parents");
  for (let key of relMap.keys()) {
    relMap = marryParents(relMap.get(key), relMap, idPerson);
  }
  // console.log();
  // remove dangling nodes, i.e non-confirmed marriages, or people on edge without mother or father.
  var newOutput = [];
  // apply filters
  // move map to 
  console.log(yearFrom);
  console.log(yearTo);

  // push to array


  // apply filters (add opacity to non-filtered)
  for (let key of relMap.keys()) {
    let r = relMap.get(key);
    if (applyDateOfBirthFilter(key, yearFrom, yearTo, idPerson) && applyFamilyFilter(key, familyName, idPerson)) {
      r.opacity = r.opacity == null ? "1.0" : r.opacity;
    } else {
      r.opacity = "0.2";
    }
    relMap.set(key, r);
  }
  console.log(relMap.values());

  for (let key of relMap.keys()) {
    let r = relMap.get(key);
    relMap = addUnknown(r, relMap);
  }

  for (let key of relMap.keys()) {
    newOutput.push(relMap.get(key));
  }
  // after adding unknown to smoothen out the graph.
  console.log(newOutput);
  return newOutput;

}

function marryParents(mfs, relMap, idPerson) {
  // console.log(mfs);
  if (mfs.m != null && mfs.f != null) {
    let x = relMap.get(unConvert(mfs.f));
    let y = relMap.get(unConvert(mfs.m));
    // console.log(x);
    // console.log(y);
    if ((x.ux == null || x.ux != y.key) && (y.vir == null || y.vir != x.key)) {
      console.log(y.key + " now pointing to " + x.key);
      updatePrevHusband(y, relMap, idPerson);
      y.vir = x.key;
      relMap.set(unConvert(y.key), y);
    }
  }
  // case of unknown father - temporarily replace with "unknown" node
  return relMap;
}

function addUnknown(mfs, relMap) {
  if (mfs.m != null && mfs.f == null) {
    let r2 = relMap.get(unConvert(mfs.m));
    let newF = {key: mfs.m + 1, n: "unknown", s: 'M', opacity: '0.2'};
    // marry parent to unknown and set child parent to unknown
    newF.ux = r2.key;
    mfs.f = newF.key;
    relMap.set(unConvert(newF.key), newF);
    relMap.set(unConvert(mfs.key), mfs);
  }

  // case of unknown mother - temporarily replace with "unknown" node
  if (mfs.m == null && mfs.f != null) {
    let r2 = relMap.get(unConvert(mfs.f));
    let newM = {key: mfs.f + 1, n: "unknown", s: 'F', opacity: '0.2'};
    // marry parent to unknown and set child parent to unknown
    newM.vir = r2.key;
    mfs.m = newM.key;
    relMap.set(unConvert(newM.key), newM);
    relMap.set(unConvert(mfs.key), mfs);
  }

  return relMap;
}

function updatePrevWife(mfs, relMap, idPerson) {
  // this was your partner before
  let key = mfs.ux;
  // base case end recursion.
  if (key == undefined) {
    return relMap;
  }
  var prev = {};
  if (relMap.has(unConvert(key))) {
    prev = relMap.get(unConvert(key));
  } else {
    let person = idPerson.get(unConvert(key));
    let addProps = person.additionalProperties;
    prev = {key: toInt(person.id), n: person.name, s: (addProps.filter(p => p.name == "gender"))[0].value, vir: mfs.key};
    console.log("SHOULDNT GET HERE");
    console.log(JSON.stringify(prev));
    relMap.set(unConvert(prev.key), prev);
    return relMap;
  }
  // looping over person you were pointing to before
  // set prev husband to your id, apply recursively.
  if (prev.vir == undefined) {
    prev.vir = mfs.key;
    console.log(prev.key + "husband now pointing to " + mfs.key);
    relMap = relMap.set(unConvert(prev.key), prev);
    return relMap;
  } else if (prev.vir == mfs.key) {
    return relMap;
  } else {
    // must be case that previously pointed to someone else
    let temp = prev;
    relMap = updatePrevHusband(temp, relMap, idPerson);
    prev.vir = mfs.key;
    console.log(prev.key + "husband now pointing to " + mfs.key);
    return relMap.set(unConvert(prev.key), prev);
  }
}

function updatePrevHusband(mfs, relMap, idPerson) {
  let key = mfs.vir;
  // base case end recursion.
  if (key == undefined) {
    return relMap;
  }
  var prev = {};
  if (relMap.has(unConvert(key))) {
    prev = relMap.get(unConvert(key));
  } else {
    let person = idPerson.get(unConvert(key));
    let addProps = person.additionalProperties;
    prev = {key: toInt(person.id), n: person.name, s: (addProps.filter(p => p.name == "gender"))[0].value, ux: mfs.key};
    console.log("SHOULDNT GET HERE");
    console.log(JSON.stringify(prev));
    relMap.set(unConvert(prev.key), prev);
    return relMap;
  }
  // set prev husband to your id, apply recursively.
  if (prev.ux == undefined) {
    prev.ux = mfs.key;
    relMap = relMap.set(unConvert(prev.key), prev);
    console.log(prev.key + "wife now pointing to " + mfs.key);
    return relMap;
  } else if (prev.ux == mfs.key) {
    return relMap;
  } else {
    // must be case that previously pointed to someone else
    console.log(prev.key + "wife now pointing to " + mfs.key);
    let temp = prev;
    relMap = updatePrevWife(temp, relMap, idPerson);
    prev.ux = mfs.key;
    relMap = relMap.set(unConvert(prev.key), prev);
    return relMap;
  }
}

function unConvert(numKey) {
  return "WD-Q" + numKey.toString();
}

// creates base node for the item2 in a relation between item1 -> item2 (item1 node is created earlier in the code)
function createRelation(key, idPerson, relMap) {
  if (relMap.has(key)) {
    return relMap;
  } else {
      let target2 = idPerson.get(key);
      let addProps = target2.additionalProperties;
      let mfs = {key: toInt(target2.id), n: target2.name, s: (addProps.filter(p => p.name == "gender"))[0].value};
      relMap.set(key, mfs);
      return relMap;
  }

}

// Create a map of maps
// Outer map: personId -> inner map
// Inner map: property -> value
function getPersonMap(data) {
  let personMap = new Map;
  for (let person of data) {
    const personId = person.id;
    let attributes = new Map;
    attributes.set("name", person.name);
    attributes.set("description", person.description);

    for (let attr of person.additionalProperties) {
      let fieldName  = attr.name;
      let fieldValue = attr.value;
      // If field doesn't present, don't put in the Map
      if (fieldValue === null || fieldValue === "") continue;

      switch (fieldName) {
        case "date of birth":
          fieldValue = fieldValue.replace(/^0+/, '').split("T")[0];
        case "date of death":
          fieldValue = fieldValue.replace(/^0+/, '').split("T")[0];
        default:
      }
      attributes.set(fieldName, fieldValue);
    }

    personMap.set(personId, attributes)
  }
  return personMap;
}

export class DiagramWrappper extends React.Component {
  static relMap = relMap;
  constructor(props) {
    super(props);
    this.diagramRef = React.createRef();
    this.nodeDataArray = props.nodeDataArray;
    this.yearFrom = props.yearFrom;
    this.yearTo = props.yearTo;
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
    const $ = go.GraphObject.make;

      const myDiagram =
        $(go.Diagram,
          {
            initialAutoScale: go.Diagram.Uniform,
            "undoManager.isEnabled": false,
            // when a node is selected, draw a big yellow circle behind it
            nodeSelectionAdornmentTemplate:
              $(go.Adornment, "Auto",
                { layerName: "Grid" },  // the predefined layer that is behind everything else
                $(go.Shape, "Circle", {fill: "#c1cee3", stroke: null }),
                $(go.Placeholder, { margin: 2 })
              ),
            layout:  // use a custom layout, defined below
              $(GenogramLayout, { direction: 90, layerSpacing: 30, columnSpacing: 10 })
          });
      // this.myDiagram.toolManager.panningTool.isEnabled = false;

      // determine the color for each attribute shape
      function attrFill(a) {
        switch (a) {
          case "A": return "#00af54"; // green
          case "B": return "#f27935"; // orange
          case "C": return "#d4071c"; // red
          case "D": return "#70bdc2"; // cyan
          case "E": return "#fcf384"; // gold
          case "F": return "#e69aaf"; // pink
          case "G": return "#08488f"; // blue
          case "H": return "#866310"; // brown
          case "I": return "#9270c2"; // purple
          case "J": return "#a3cf62"; // chartreuse
          case "K": return "#91a4c2"; // lightgray bluish
          case "L": return "#af70c2"; // magenta
          case "S": return "#d4071c"; // red
          default: return "transparent";
        }
      }
      // determine the geometry for each attribute shape in a male;
      // except for the slash these are all squares at each of the four corners of the overall square
      const tlsq = go.Geometry.parse("F M1 1 l19 0 0 19 -19 0z");
      const trsq = go.Geometry.parse("F M20 1 l19 0 0 19 -19 0z");
      const brsq = go.Geometry.parse("F M20 20 l19 0 0 19 -19 0z");
      const blsq = go.Geometry.parse("F M1 20 l19 0 0 19 -19 0z");
      const slash = go.Geometry.parse("F M38 0 L40 0 40 2 2 40 0 40 0 38z");
      function maleGeometry(a) {
        switch (a) {
          case "A": return tlsq;
          case "B": return tlsq;
          case "C": return tlsq;
          case "D": return trsq;
          case "E": return trsq;
          case "F": return trsq;
          case "G": return brsq;
          case "H": return brsq;
          case "I": return brsq;
          case "J": return blsq;
          case "K": return blsq;
          case "L": return blsq;
          case "S": return slash;
          default: return tlsq;
        }
      }

      // determine the geometry for each attribute shape in a female;
      // except for the slash these are all pie shapes at each of the four quadrants of the overall circle
      const tlarc = go.Geometry.parse("F M20 20 B 180 90 20 20 19 19 z");
      const trarc = go.Geometry.parse("F M20 20 B 270 90 20 20 19 19 z");
      const brarc = go.Geometry.parse("F M20 20 B 0 90 20 20 19 19 z");
      const blarc = go.Geometry.parse("F M20 20 B 90 90 20 20 19 19 z");
      function femaleGeometry(a) {
        switch (a) {
          case "A": return tlarc;
          case "B": return tlarc;
          case "C": return tlarc;
          case "D": return trarc;
          case "E": return trarc;
          case "F": return trarc;
          case "G": return brarc;
          case "H": return brarc;
          case "I": return brarc;
          case "J": return blarc;
          case "K": return blarc;
          case "L": return blarc;
          case "S": return slash;
          default: return tlarc;
        }
      }


      // two different node templates, one for each sex,
      // named by the category value in the node data object
      myDiagram.nodeTemplateMap.add("M",  // male
        $(go.Node, "Vertical",
        // TODO can make this non-selectable with selectable: false, but we want clickable but not movable?
        // see this for how to do stuff on click? - https://gojs.net/latest/extensions/Robot.html
          {movable: false, locationSpot: go.Spot.Center, locationObjectName: "ICON", selectionObjectName: "ICON"},
          new go.Binding("opacity", "hide", h => h ? 0 : 1),
          new go.Binding("pickable", "hide", h => !h),
          $(go.Panel,
            { name: "ICON" },
            $(go.Shape, "Square",
              {width: 40, height: 40, strokeWidth: 2, fill: "#7ec2d7", stroke: "#919191", portId: "" },
              new go.Binding("fill", "fill"),
              new go.Binding("opacity", "opacity")),
            $(go.Panel,
              { // for each attribute show a Shape at a particular place in the overall square
                itemTemplate:
                  $(go.Panel,
                    $(go.Shape,
                      { stroke: null, strokeWidth: 0 },
                      new go.Binding("fill", "", attrFill),
                      new go.Binding("geometry", "", maleGeometry))
                  ),
                margin: 1
              },
              new go.Binding("itemArray", "a")
            )
          ),
          $(go.TextBlock,
            { textAlign: "center", maxSize: new go.Size(80, NaN), background: "rgba(255,255,255,0.5)" },
            new go.Binding("text", "n"), new go.Binding("opacity", "opacity"))
        ));

      myDiagram.nodeTemplateMap.add("F",  // female
        $(go.Node, "Vertical",
          { movable: false, locationSpot: go.Spot.Center, locationObjectName: "ICON", selectionObjectName: "ICON" },
          new go.Binding("opacity", "hide", h => h ? 0 : 1),
          new go.Binding("pickable", "hide", h => !h),
          $(go.Panel,
            { name: "ICON" },
            $(go.Shape, "Circle",
              { width: 40, height: 40, strokeWidth: 2, fill: "#ff99a8", stroke: "#a1a1a1", portId: "" },
              new go.Binding("opacity", "opacity")),
            $(go.Panel,
              { // for each attribute show a Shape at a particular place in the overall circle
                itemTemplate:
                  $(go.Panel,
                    $(go.Shape,
                      { stroke: null, strokeWidth: 0 },
                      new go.Binding("fill", "", attrFill),
                      new go.Binding("geometry", "", femaleGeometry))
                  ),
                margin: 1
              },
              new go.Binding("itemArray", "a")
            )
          ),
          $(go.TextBlock,
            { textAlign: "center", maxSize: new go.Size(80, NaN), background: "rgba(255,255,255,0.5)" },
            new go.Binding("text", "n"), new go.Binding("opacity", "opacity"))
        ));

      // the representation of each label node -- nothing shows on a Marriage Link
      myDiagram.nodeTemplateMap.add("LinkLabel",
        $(go.Node, { selectable: false, width: 1, height: 1, fromEndSegmentLength: 20 }));


      myDiagram.linkTemplate =  // for parent-child relationships
        $(go.Link,
          {
            routing: go.Link.Orthogonal, corner: 5,
            layerName: "Background", selectable: false,
          },
          $(go.Shape, { stroke: "#424242", strokeWidth: 2}, new go.Binding("opacity", "opacity"))
        );

      myDiagram.linkTemplateMap.add("Marriage",  // for marriage relationships
        $(go.Link,
          { selectable: false, layerName: "Background" },
          $(go.Shape, { strokeWidth: 2.5, stroke: "#5d8cc1" /* blue */}, new go.Binding("opacity", "opacity"))
        ));

          // hardcoded input after applying transform(data), copide in from console TODO - needs to see updated state without crashing and being undefined.
      setupDiagram(myDiagram, this.nodeDataArray, this.nodeDataArray[0].key);
    

    // create and initialize the Diagram.model given an array of node data representing people
    function setupDiagram(diagram, array, focusId) {
      diagram.model =
        new go.GraphLinksModel(
          { // declare support for link label nodes
            linkLabelKeysProperty: "labelKeys",
            // this property determines which template is used
            nodeCategoryProperty: "s",
            // if a node data object is copied, copy its data.a Array
            copiesArrays: true,
            // create all of the nodes for people
            //TODO this should be got from this.state.relationsJson from App.js
            nodeDataArray: array
          });
      setupMarriages(diagram);
      setupParents(diagram);

      const node = diagram.findNodeForKey(focusId);
      if (node !== null) {
        diagram.select(node);
      }
    }


    function findMarriage(diagram, a, b) {  // A and B are node keys
      const nodeA = diagram.findNodeForKey(a);
      const nodeB = diagram.findNodeForKey(b);
      if (nodeA !== null && nodeB !== null) {
        const it = nodeA.findLinksBetween(nodeB);  // in either direction
        while (it.next()) {
          const link = it.value;
          // Link.data.category === "Marriage" means it's a marriage relationship
          if (link.data !== null && link.data.category === "Marriage") return link;
        }
      }
      return null;
    }

    // now process the node data to determine marriages
    function setupMarriages(diagram) {
      const model = diagram.model;
      const nodeDataArray = model.nodeDataArray;
      for (let i = 0; i < nodeDataArray.length; i++) {
        const data = nodeDataArray[i];
        const key = data.key;
        // filtering
        let uxs = data.ux;
        let opacity = data.opacity;
        if (uxs !== undefined) {
          if (typeof uxs === "number") uxs = [uxs];
          for (let j = 0; j < uxs.length; j++) {
            const wife = uxs[j];
            const wdata = model.findNodeDataForKey(wife);
            if (key === wife) {
              console.log("cannot create Marriage relationship with self" + wife);
              continue;
            }
            if (!wdata) {
                console.log("cannot create Marriage relationship with unknown person " + wife);
                continue;
            }
            if (wdata.s !== "F") {
                console.log("cannot create Marriage relationship with wrong gender person " + wife);
                continue;
            }
            const link = findMarriage(diagram, key, wife);
            if (link === null) {
              // add a label node for the marriage link
              const mlab = { s: "LinkLabel" };
              model.addNodeData(mlab);
              // add the marriage link itself, also referring to the label node
              const mdata = { from: key, to: wife, labelKeys: [mlab.key], category: "Marriage" , opacity: opacity};
              model.addLinkData(mdata);
            }
          }
        }
        let virs = data.vir;
        opacity = data.opacity;
        if (virs !== undefined) {
          if (typeof virs === "number") virs = [virs];
          for (let j = 0; j < virs.length; j++) {
            const husband = virs[j];
            const hdata = model.findNodeDataForKey(husband);
            if (key === husband) {
              console.log("cannot create Marriage relationship with self" + husband);
              continue;
            }
            if (!hdata) {
                console.log("cannot create Marriage relationship with unknown person " + husband);
                continue;
            }
            if (hdata.s !== "M") {
                console.log("cannot create Marriage relationship with wrong gender person " + husband);
                continue;
            }
            const link = findMarriage(diagram, key, husband);
            if (link === null) {
              // add a label node for the marriage link
              const mlab = { s: "LinkLabel" };
              model.addNodeData(mlab);
              // add the marriage link itself, also referring to the label node
              const mdata = { from: key, to: husband, labelKeys: [mlab.key], category: "Marriage" , opacity: opacity};
              model.addLinkData(mdata);
            }
          }
        }
      }
    }


    // process parent-child relationships once all marriages are known
    function setupParents(diagram) {
      const model = diagram.model;
      const nodeDataArray = model.nodeDataArray;
      for (let i = 0; i < nodeDataArray.length; i++) {
        const data = nodeDataArray[i];
        const key = data.key;
        const mother = data.m;
        const father = data.f;
        // filter

        // for filtering
        if (mother !== undefined && father !== undefined) {
          const link = findMarriage(diagram, mother, father);
          let opacity = "1.0";
          if (((relMap.get(unConvert(data.m))).opacity != "1.0" && (relMap.get(unConvert(data.f))).opacity != "1.0")
           || data.opacity != "1.0") {
            opacity = "0.2";
          }
          if (link === null) {
            // or warn no known mother or no known father or no known marriage between them
            console.log("unknown marriage: " + mother + " & " + father);
            continue;
          }
          const mdata = link.data;
          if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) continue;
          const mlabkey = mdata.labelKeys[0];
          console.log("MLAB KEY: " + mlabkey);
          const cdata = { from: mlabkey, to: key, opacity: opacity};
          myDiagram.model.addLinkData(cdata);
        }
      }
    }
    return myDiagram;
  }

  render() {
    return (
          <ReactDiagram
            ref={this.diagramRef}
            divClassName='diagram-component'
            initDiagram={this.init}
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
export class GenogramTree extends React.Component {
    constructor(props) {
      super(props);
      this.handleModelChange = this.handleModelChange.bind(this);
      this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
      this.closePopUp = this.closePopUp.bind(this);
      // need to pass the filter somewhere else.
      this.relations = transform(props.rawJson, props.from, props.to, props.familyName);
      this.personMap = getPersonMap(props.rawJson.items);
      this.from = props.from;
      this.to = props.to;
      this.familyName = props.familyName;
      this.state = {
        personInfo: null,
        isPopped: false
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
        this.setState({
          personInfo: event.subject.part.key,
          isPopped: true
        })
      }

    // renders ReactDiagram
    render() {
      console.log("inside genogramtree");
      console.log("From: " + this.from);
      console.log("To: " + this.to);
        return(
			<div className="tree-box">
			{
				this.state.isPopped
				? <div className="popup">
					<PopupInfo 
						closePopUp={this.closePopUp}
						info={this.personMap.get("WD-Q"+this.state.personInfo)}>
					</PopupInfo>
				</div>
				: ""
			}
          
            <DiagramWrappper
                nodeDataArray={this.relations}
                onModelChange={this.handleModelChange}
                onDiagramEvent={this.handleDiagramEvent}
                yearFrom = {this.from}
                yearTo = {this.to}
            />
            
            </div>
        );
    }
    // initialises tree (in theory should only be called once, diagram should be .clear() and then data updated for re-initialisation)
    // see https://gojs.net/latest/intro/react.html

    // majority of code below is from https://gojs.net/latest/samples/genogram.html
  

  }

  // extra class not sure what i
  class GenogramLayout extends go.LayeredDigraphLayout {
    constructor() {
      super();
      this.initializeOption = go.LayeredDigraphLayout.InitDepthFirstIn;
      this.spouseSpacing = 30;  // minimum space between spouses
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
      // consider all Nodes in the given collection
      const it = coll.iterator;
      while (it.next()) {
        const node = it.value;
        if (!(node instanceof go.Node)) continue;
        if (!node.isLayoutPositioned || !node.isVisible()) continue;
        if (nonmemberonly && node.containingGroup !== null) continue;
        // if it's an unmarried Node, or if it's a Link Label Node, create a LayoutVertex for it
        if (node.isLinkLabel) {
          // get marriage Link
          const link = node.labeledLink;
          const spouseA = link.fromNode;
          const spouseB = link.toNode;
          // create vertex representing both husband and wife
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
        // if it's a parent-child link, add a LayoutEdge for it
        if (!link.isLabeledLink) {
          const parent = net.findVertex(link.fromNode);  // should be a label node
          const child = net.findVertex(link.toNode);
          if (child !== null) {  // an unmarried child
            net.linkVertexes(parent, child, link);
          } else {  // a married child
            link.toNode.linksConnected.each(l => {
              if (!l.isLabeledLink) return;  // if it has no label node, it's a parent-child link
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
        cohort.each(n => {
          n.linksConnected.each(l => {
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
        if (l.isLabeledLink) {  // if it's a marriage link, continue with both spouses
          this.extendCohort(coll, l.fromNode);
          this.extendCohort(coll, l.toNode);
        }
      });
    }

    assignLayers() {
      super.assignLayers();
      const horiz = this.direction === 0.0 || this.direction === 180.0;
      // for every vertex, record the maximum vertex width or height for the vertex's layer
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
      console.log(horiz);
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
          if (spouseA.data.s === "F") {  // sex is female
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
          // see if there's any empty space at the horizontal mid-point in that layer
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
        const n = it.value;
        if (n.isLinkLabel) return n;
      }
      return null;
    }
  }