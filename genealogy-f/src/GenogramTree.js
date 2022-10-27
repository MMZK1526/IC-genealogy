import {FamilyTree} from "./components/family-tree/FamilyTree";
import _ from "lodash";
import {Sidebar} from './components/sidebar/Sidebar.js';
import {Requests} from './requests';
import React from "react";
import * as go from 'gojs';
import {ReactDiagram} from 'gojs-react';
import './App.css';


// helper function to convert "WD-Q13423" -> 13423
function toInt(str) {
    return Number(str.substring(4));
  }

// { key: 0, n: "Aaron", s: "M", m: -10, f: -11, ux: 1, a: ["C", "F", "K"] },
// { key: 1, n: "Alice", s: "F", m: -12, f: -13, a: ["B", "H", "K"] },
// n: name, s: sex, m: mother, f: father, ux: wife, vir: husband, a: attributes/markers

// ^^^^^^ SEE ABOVE transformed format helper function to transfrom JSON into goJS nodeDataArray format.
export function transform(data) {
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
  const relMap = new Map();
  // create a map from personId to (relation array of their mother, father and spouse )
  // console.log(data.relations);
  for (let relation of data.relations) {
      var key = relation['item1Id'];
      console.log(key);
      var target2 = idPerson.get(key);
      // check if relation ID exist in data.item, if not then discard (edge of search?)
      if (target2 == undefined) {
        console.log(key);
        console.log(key + "was not found in data.items");
      }
      // console.log(target2);
      // split select target into their additional properties (general, not predetermined)
      // need a filter here depending on which type of tree we are using.
      var addProps = target2.additionalProperties;
      var mfs = {};
      if (relMap.has(key)) {
          mfs = relMap.get(key);
      } else {
          mfs = {key: toInt(target2.id), n: target2.name, s: addProps[4].value};
      }
      // console.log(target2)
      // console.log(relation)
      // check each relationship if so update record accordingly
      if (relation.type == 'mother') {
          mfs.m = toInt(relation.item2Id);
      }
      if (relation.type == 'father') {
          mfs.f = toInt(relation.item2Id);
      }
      if (relation.type == 'spouse') {
              if (addProps[4].value == 'M') {
                  mfs.ux = toInt(relation.item2Id);
              } else {
                  mfs.vir = toInt(relation.item2Id);
              }
      }
      relMap.set(relation['item1Id'], mfs)
  }
  const output = [];
  // loop through keys (bug of 3 targets in people, otherwise can loop through them)
  for (let key of idPerson.keys()) {
      if (relMap.has(key)) {
          output.push(relMap.get(key));
      } else {
          var person = idPerson.get(key);
          // top layer
          output.push({key : toInt(person.id), n: person.name, s: (person.additionalProperties)[4].value})
      }
  }
  console.log(output);
  return (output);
}

export class DiagramWrappper extends React.Component {
  constructor(props) {
    super(props);
    this.diagramRef = React.createRef();
    this.nodeDataArray = props.nodeDataArray;

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
          {movable: true, locationSpot: go.Spot.Center, locationObjectName: "ICON", selectionObjectName: "ICON"},
          new go.Binding("opacity", "hide", h => h ? 0 : 1),
          new go.Binding("pickable", "hide", h => !h),
          $(go.Panel,
            { name: "ICON" },
            $(go.Shape, "Square",
              {width: 40, height: 40, strokeWidth: 2, fill: "#ADD8E6", stroke: "#919191", portId: "" }),
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
            new go.Binding("text", "n"))
        ));

      myDiagram.nodeTemplateMap.add("F",  // female
        $(go.Node, "Vertical",
          { movable: true, locationSpot: go.Spot.Center, locationObjectName: "ICON", selectionObjectName: "ICON" },
          new go.Binding("opacity", "hide", h => h ? 0 : 1),
          new go.Binding("pickable", "hide", h => !h),
          $(go.Panel,
            { name: "ICON" },
            $(go.Shape, "Circle",
              { width: 40, height: 40, strokeWidth: 2, fill: "#FFB6C1", stroke: "#a1a1a1", portId: "" }),
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
            new go.Binding("text", "n"))
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
          $(go.Shape, { stroke: "#424242", strokeWidth: 2 })
        );

      myDiagram.linkTemplateMap.add("Marriage",  // for marriage relationships
        $(go.Link,
          { selectable: false, layerName: "Background" },
          $(go.Shape, { strokeWidth: 2.5, stroke: "#5d8cc1" /* blue */ })
        ));

          // hardcoded input after applying transform(data), copide in from console TODO - needs to see updated state without crashing and being undefined.
      setupDiagram(myDiagram, this.nodeDataArray, 43274);
    

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
        let uxs = data.ux;
        if (uxs !== undefined) {
          if (typeof uxs === "number") uxs = [uxs];
          for (let j = 0; j < uxs.length; j++) {
            const wife = uxs[j];
            const wdata = model.findNodeDataForKey(wife);
            if (key == wife) {
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
              const mdata = { from: key, to: wife, labelKeys: [mlab.key], category: "Marriage" };
              model.addLinkData(mdata);
            }
          }
        }
        let virs = data.vir;
        if (virs !== undefined) {
          if (typeof virs === "number") virs = [virs];
          for (let j = 0; j < virs.length; j++) {
            const husband = virs[j];
            const hdata = model.findNodeDataForKey(husband);
            if (key == husband) {
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
              const mdata = { from: key, to: husband, labelKeys: [mlab.key], category: "Marriage" };
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
        if (mother !== undefined && father !== undefined) {
          const link = findMarriage(diagram, mother, father);
          if (link === null) {
            // or warn no known mother or no known father or no known marriage between them
            console.log("unknown marriage: " + mother + " & " + father);
            continue;
          }
          const mdata = link.data;
          if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) continue;
          const mlabkey = mdata.labelKeys[0];
          const cdata = { from: mlabkey, to: key };
          myDiagram.model.addLinkData(cdata);
        }
      }
    }
    return myDiagram;}

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
    nodeList = [
        {
            "key": 43274,
            "n": "Charles III",
            "s": "M",
            "f": 80976,
            "m": 9682,
            "ux": 9685
        },
        {
            "key": 9682,
            "n": "Elizabeth II",
            "s": "F",
            "f": 280856,
            "m": 10633,
            "vir": 80976,
        },
        {
            "key": 80976,
            "n": "Prince Philip, Duke of Edinburgh",
            "s": "M",
            "ux": 9682,
            "f": 156531,
            "m": 116062
        },
        {
            "key": 36812,
            "n": "William, Prince of Wales",
            "s": "M",
            "f": 43274,
            "m": 9685
        },
        {
            "key": 152239,
            "n": "Queen Camilla",
            "s": "F",
            "vir": 43274,
            "f": 327457,
            "m": 17363684
        },
        {
            "key": 152316,
            "n": "Prince Harry, Duke of Sussex",
            "s": "M",
            "f": 43274,
            "m": 9685,
            "ux": 3304418
        },
        {
            "key": 9685,
            "n": "Diana, Princess of Wales",
            "s": "F",
            "f": 593671,
            "m": 256893,
            "vir": 43274,
        },
        {
            "key": 10633,
            "n": "Queen Elizabeth, The Queen Mother",
            "s": "F",
            "f": 335159,
            "m": 238820,
            "vir": 280856
        },
        {
            "key": 116062,
            "n": "Princess Alice of Battenberg",
            "s": "F",
            "f": 57468,
            "m": 57658,
            "vir": 156531
        },
        {
            "key": 156531,
            "n": "Prince Andrew of Greece and Denmark",
            "s": "M",
            "f": 17142,
            "m": 155178
        },
        {
            "key": 280856,
            "n": "George VI",
            "s": "M",
            "f": 269412,
            "m": 76927
        },
        {
            "key": 327457,
            "n": "Bruce Shand",
            "s": "M",
            "f": 7184109,
            "m": 17308990
        },
        {
            "key": 17363684,
            "n": "Rosalind Cubitt",
            "s": "F",
            "vir": 327457,
            "f": 7360200,
            "m": 7561697
        },
        {
            "key": 10479,
            "n": "Catherine, Princess of Wales",
            "s": "F",
            "vir": 36812,
            "f": 14244505,
            "m": 14244952
        },
        {
            "key": 151754,
            "n": "Anne, Princess Royal",
            "s": "F",
            "m": 9682,
            "f": 80976,
            "vir": 2063224
        },
        {
            "key": 153330,
            "n": "Prince Andrew, Duke of York",
            "s": "M",
            "m": 9682,
            "f": 80976,
            "ux": 55720
        },
        {
            "key": 154920,
            "n": "Prince Edward, Earl of Wessex and Forfar",
            "s": "M",
            "m": 9682,
            "f": 80976,
            "ux": 155203
        },
        {
            "key": 3304418,
            "n": "Meghan, Duchess of Sussex",
            "s": "F",
            "f": 43918214,
            "m": 43918160
        },
        {
            "key": 3736070,
            "n": "Tom Parker Bowles",
            "s": "M",
            "m": 152239,
            "f": 2221868,
            "ux": 75587832
        },
        {
            "key": 3743314,
            "n": "Laura Lopes",
            "s": "F",
            "m": 152239,
            "f": 2221868,
            "vir": 75587834
        },
        {
            "key": 13590412,
            "n": "Prince George of Wales",
            "s": "M",
            "f": 36812,
            "m": 10479
        },
        {
            "key": 18002970,
            "n": "Princess Charlotte of Wales",
            "s": "F",
            "f": 36812,
            "m": 10479
        },
        {
            "key": 38668629,
            "n": "Prince Louis of Wales",
            "s": "M",
            "f": 36812,
            "m": 10479
        },
        {
            "key": 62938826,
            "n": "Archie Mountbatten-Windsor",
            "s": "M",
            "f": 152316,
            "m": 3304418
        },
        {
            "key": 107125551,
            "n": "Lilibet Mountbatten-Windsor",
            "s": "F",
            "f": 152316,
            "m": 3304418
        },
        {
            "key": 55720,
            "n": "Sarah, Duchess of York",
            "s": "F"
        },
        {
            "key": 147663,
            "n": "Zara Tindall",
            "s": "F",
            "m": 151754
        },
        {
            "key": 155203,
            "n": "Sophie, Countess of Wessex and Forfar",
            "s": "F"
        },
        {
            "key": 165657,
            "n": "Princess Beatrice",
            "s": "F",
            "f": 153330
        },
        {
            "key": 165709,
            "n": "Princess Eugenie of York",
            "s": "F",
            "f": 153330
        },
        {
            "key": 344908,
            "n": "Peter Phillips",
            "s": "M",
            "m": 151754
        },
        {
            "key": 550183,
            "n": "James, Viscount Severn",
            "s": "M",
            "f": 154920
        },
        {
            "key": 680304,
            "n": "Lady Louise Windsor",
            "s": "F",
            "f": 154920
        },
        {
            "key": 2063224,
            "n": "Timothy Laurence",
            "s": "M"
        },
        {
            "key": 2221868,
            "n": "Andrew Parker Bowles",
            "s": "M"
        },
        {
            "key": 7184109,
            "n": "Philip Morton Shand",
            "s": "M"
        },
        {
            "key": 7360200,
            "n": "Roland Cubitt, 3rd Baron Ashcombe",
            "s": "M"
        },
        {
            "key": 7561697,
            "n": "Sonia Cubitt, Baroness Ashcombe",
            "s": "F"
        },
        {
            "key": 14244505,
            "n": "Michael Middleton",
            "s": "M"
        },
        {
            "key": 14244952,
            "n": "Carole Middleton",
            "s": "F"
        },
        {
            "key": 16142673,
            "n": "Annabel Elliot",
            "s": "F",
            "f": 327457,
            "m": 17363684
        },
        {
            "key": 17308990,
            "n": "Edith Marguerite Harrington",
            "s": "F"
        },
        {
            "key": 43918160,
            "n": "Doria Ragland",
            "s": "F"
        },
        {
            "key": 43918214,
            "n": "Thomas Markle",
            "s": "M"
        },
        {
            "key": 75587832,
            "n": "Sara Buys",
            "s": "F"
        },
        {
            "key": 75587834,
            "n": "Harry Lopes",
            "s": "M"
        },
        {
            "key": 75723263,
            "n": "Lola Parker Bowles",
            "s": "F",
            "f": 3736070
        },
        {
            "key": 75723264,
            "n": "Eliza Lopes",
            "s": "F",
            "m": 3743314
        },
        {
            "key": 75982135,
            "n": "Gus Lopes",
            "s": "M",
            "m": 3743314
        },
        {
            "key": 75982642,
            "n": "Louis Lopes",
            "s": "M",
            "m": 3743314
        },
        {
            "key": 76022497,
            "n": "Freddy Parker Bowles",
            "s": "M",
            "f": 3736070
        },
        {
            "key": 17142,
            "n": "George I of Greece",
            "s": "M"
        },
        {
            "key": 57468,
            "n": "Prince Louis of Battenberg",
            "s": "M"
        },
        {
            "key": 57658,
            "n": "Princess Victoria, Marchioness of Milford Haven",
            "s": "F"
        },
        {
            "key": 76927,
            "n": "Mary of Teck",
            "s": "F"
        },
        {
            "key": 153815,
            "n": "Princess Margaret, Countess of Snowdon",
            "s": "F",
            "m": 10633,
            "f": 280856,
        },
        {
            "key": 155178,
            "n": "Olga Constantinovna of Russia",
            "s": "F"
        },
        {
            "key": 236196,
            "n": "Princess Cecilie of Greece and Denmark",
            "s": "F",
            "m": 116062,
            "f": 156531
        },
        {
            "key": 238820,
            "n": "Cecilia Bowes-Lyon, Countess of Strathmore and Kinghorne",
            "s": "F"
        },
        {
            "key": 240317,
            "n": "Princess Margarita of Greece and Denmark",
            "s": "F",
            "m": 116062,
            "f": 156531
        },
        {
            "key": 255382,
            "n": "Princess Theodora, Margravine of Baden",
            "s": "F",
            "m": 116062,
            "f": 156531
        },
        {
            "key": 256893,
            "n": "Frances Shand Kydd",
            "s": "F"
        },
        {
            "key": 269412,
            "n": "George V",
            "s": "M"
        },
        {
            "key": 335159,
            "n": "Claude Bowes-Lyon, 14th Earl of Strathmore and Kinghorne",
            "s": "M"
        },
        {
            "key": 593671,
            "n": "John Spencer, 8th Earl Spencer",
            "s": "M"
        },
        {
            "key": 630371,
            "n": "Princess Sophie of Greece and Denmark",
            "s": "F",
            "m": 116062,
            "f": 156531
        },
        {
            "key": 15488831,
            "n": "Mark Shand",
            "s": "M",
            "f": 327457,
            "m": 17363684
        }
    ];
    constructor(props) {
      super(props);
      this.handleModelChange = this.handleModelChange.bind(this);
      this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
      this.relations = props.relations // this relations referse to full /relations API response
    }

    handleModelChange(changes) {
        console.log('GoJS model changed!');
    }

    handleDiagramEvent (event) {
        console.log(event.subject.part.key);
      }

    // renders ReactDiagram
    render() {
        console.log("Start")
        console.log(this.relations);
        console.log("Finish")
        return(
            <DiagramWrappper
                // nodeDataArray = {}
                nodeDataArray={transform(this.relations)}
                onModelChange={this.handleModelChange}
                onDiagramEvent={this.handleDiagramEvent}
            />
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
      const horiz = this.direction == 0.0 || this.direction == 180.0;
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
      const horiz = this.direction == 0.0 || this.direction == 180.0;
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
      const horiz = this.direction == 0.0 || this.direction == 180.0;
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