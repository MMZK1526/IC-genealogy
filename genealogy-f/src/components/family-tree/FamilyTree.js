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

const renderForeignObjectNode = ({
    nodeDatum,
    toggleNode,
    foreignObjectProps
  }) => (

    <g>
      <circle r={15} className = {nodeDatum.className}></circle>
      {/* `foreignObject` requires width & height to be explicitly set. */}
      <foreignObject {...foreignObjectProps}>
        {/* <div><img src={Charles} width={img.width} height={img.height} alt="contacts" /></div> */}
        <div x="30" y ="10">{nodeDatum.name}</div>
        <div><img src={nodeDatum.image} width="100" height="126" alt="N/A" /></div>
        {/* <div style={{ border: "1px solid black", backgroundColor: "#dedede" }}>
          <h3 style={{ textAlign: "center" }}>hello</h3>
          {nodeDatum.children && (
            <button style={{ width: "100%" }} onClick={toggleNode}>
              {nodeDatum.__rd3t.collapsed ? "Expand" : "Collapse"}
            </button>
          )}
        </div> */}
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
        const foreignObjectProps = { width: 100, height: 200, x: 20 };
        const {innerWidth, innerHeight} = window;
        return (
            <Tree
                data={this.transform(this.props.data)}
                pathFunc='step'
                orientation='vertical'
                translate={{x: innerWidth / 2, y: innerHeight / 2}}
                depthFactor={this.state.showChildren ? 100 : -100}
                onNodeMouseOver={this.handleMouseOver}
                separation={{siblings: 3, nonSiblings: 3}}
                transitionDuration = {1000}
                nodeSize={{x:200, y:250}}
                enableLegacyTransitions={true}
                renderCustomNodeElement={(rd3tProps) =>
                    renderForeignObjectNode({ ...rd3tProps, foreignObjectProps})
                  }
            />
        );
    }

    transform(data) {
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
        let showChildren = true;
        let res = generateNode.bind(this)(targetId);

        return res;

        function generateNode(id) {
            let targetMap = generateTargetMap();
            let res1 = generateNodeHelper({id: id});
            showChildren = false;
            targetMap = generateTargetMap();
            let res2 = generateNodeHelper({id: id});
            let showChildrenExperimental = res1.max_depth >= res2.max_depth;
            let res = showChildrenExperimental ? res1 : res2;
            // this.state.showChildren = showChildrenExperimental;
            return res;

            function generateNodeHelper({id, depth = 0}={}) {
                let targetIds = targetMap.has(id) ? targetMap.get(id) : [];
                let targets = targetIds.map((id) => (generateNodeHelper({id: id, depth: depth + 1})));
                let depths = targets.map((x) => x.max_depth);
                let max_depth = depths.length > 0 ? Math.max(...depths) + 1 : depth;
                let classname = depth ? "node__default" : "node__root";
                let res = {
                    name: idName.get(id),
                    children: targets,
                    image: picMap.get(id),
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
