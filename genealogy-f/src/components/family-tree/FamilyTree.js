import { get } from 'lodash';
import React from 'react';
import Tree from 'react-d3-tree';
import './FamilyTree.css';
import Charles from './images/charlesIII.jpg';
import Elizabeth from './images/elizabeth2nd.jpg';
import Philip from './images/princePhilip.jpg';

const picMap = new Map();
picMap.set("WD-Q9682", Elizabeth);
picMap.set("WD-Q43274", Charles);
picMap.set("WD-Q80976", Philip);
// const img = new Image();
// img.src = {Charles};
function getNodeDatum(hierarchyPointNode) {
    const source = hierarchyPointNode;
    const join = 'M' + source.y + "," + source.x + 'L' + source.y + 20 + "," + source.x + 20;
    // return (<h3>{join}</h3>);
    return (<svg width="500" height="500">
                <path fill="red" d = "M10 10"></path></svg>)
        // return (
        // <path
        //     fill="none"
        //     stroke="red"
        //     d= {join}/>);
}
function test() {
    return (<h3>someText</h3>);
}

function addSpouse(nodeDatum) {
    if (nodeDatum.spouse != null) {
        return (<div><svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
        <path fill="red" d = "M -220 0 H 230"></path></svg>
    <circle cx = "230" cy="0" r={15} ></circle>
    <text x="260" y ="10">{nodeDatum.spouse}</text></div>)
    } else {
        return (<></>)
    }
}


const renderForeignObjectNode = ({
    nodeDatum,
    hierarchyPointNode,
    toggleNode,
    foreignObjectProps
  }) => (

    <g>
      <circle r={15} className = {nodeDatum.className}></circle>
      <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
        <path stroke-dasharray="10,10" fill="red" d = "M -220 0 H 230"></path></svg>
    <circle cx = "230" cy="0" r={15} ></circle>
    <text x="260" y ="10">{nodeDatum.spouse}</text>
      <foreignObject {...foreignObjectProps}>
        <div x="30" y ="10">{nodeDatum.name}</div>
        {/* <div><img src={nodeDatum.image} width="100" height="126" alt="N/A" /></div> */}
      </foreignObject>
    </g>
  );

export class FamilyTree extends React.Component {
    constructor(props) {
        super(props);
        this.transform = this.transform.bind(this);
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.state = {
            currNode: null,
            showNode: false
        };
    }

    handleMouseOver(nodeData, evt) {
        this.setState({showNode: true});
        this.setState({currNode: nodeData});
    }

    render() {
        const foreignObjectProps = { width: 200, height: 200, x: 0 };
        const {innerWidth, innerHeight} = window;
        return (
                    <Tree
                        data={this.transform(this.props.data, this.props.parents)}
                        pathFunc='step'
                        orientation='vertical'
                        translate={{x: innerWidth / 2, y: innerHeight / 2}}
                        depthFactor={this.props.data ? 100 : -100}
                        separation={{siblings: 2, nonSiblings: 2}}
                        transitionDuration = {1000}
                        nodeSize={{x:200, y:100}}
                        enableLegacyTransitions={true}
                        onNodeMouseOver={this.handleMouseOver}
                        renderCustomNodeElement={(rd3tProps) =>
                            renderForeignObjectNode({ ...rd3tProps, foreignObjectProps})
                          }
                    />
            
        );
    }

    transform(data, parents) {
        let showChildren = parents;
        let target = data.targets[0];
        let idName = new Map();
        let people = data.people;
        people.push(target);
        let targetId = target.id;
        idName.set(targetId, target.name);
        for (let x of data.people) {
            idName.set(x.id, x.name);
        }
        let relationsFiltered = data.relations.filter((x) => x.type === 'mother' || x.type === 'father');
        let spouseFiltered = data.relations.filter((x) => x.type === 'spouse');
        let spouseMap = new Map();
        for (let x of spouseFiltered) {
            console.log(x);
            spouseMap.set(x['person1Id'], idName.get(x['person2Id']))
            spouseMap.set(x['person2Id'], idName.get(x['person1Id']))
        }
        // create two trees one with parents and one with children.
        let res = generateNode.bind(this)(targetId, parents);
        return res;

        function generateNode(id, parents) {
            let targetMap = generateTargetMap();
            let res1 = generateNodeHelper({id: id});
            showChildren = false;
            targetMap = generateTargetMap();
            let res2 = generateNodeHelper({id: id});
            let showChildrenExperimental = res1.max_depth >= res2.max_depth;
            let res = parents ? res1 : res2;
            // this.state.showChildren = showChildrenExperimental;
            return res;

            function generateNodeHelper({id, depth = 0}={}) {
                let targetIds = targetMap.has(id) ? targetMap.get(id) : [];
                let targets = targetIds.map((id) => (generateNodeHelper({id: id, depth: depth + 1})));
                let depths = targets.map((x) => x.max_depth);
                let max_depth = depths.length > 0 ? Math.max(...depths) + 1 : depth;
                let classname = depth ? "node__default" : "node__root";

                let s = spouseMap.get(id) == null ? "hello" : spouseMap.get(id);
                let res = {
                    name: idName.get(id),
                    children: targets,
                    image: picMap.get(id),
                    spouse: s,
                    className: classname,
                    max_depth: max_depth,
                };
                return res;
            }
        }

        function generateTargetMap() {
            let res = new Map();
            let v1 = 'person1Id';
            let v2 = 'person2Id';
            if (showChildren) {
                [v1, v2] = [v2, v1];
            }
            for (let x of relationsFiltered) {
                if (!res.has(x[v2])) {
                    res.set(x[v2], []);
                }
                let foo = res.get(x[v2]);
                foo.push(x[v1]);
                res.set(x[v2], foo);
            }
            return res;
        }

    }
}