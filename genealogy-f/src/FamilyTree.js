import React from 'react';
import Tree from 'react-d3-tree';
import './FamilyTree.css';


const exampleData = {
    name: 'CEO',
    children: [
        {
            name: 'Manager',
            attributes: {
                department: 'Production',
            },
            children: [
                {
                    name: 'Foreman',
                    attributes: {
                        department: 'Fabrication',
                    },
                    children: [
                        {
                            name: 'Worker',
                        },
                    ],
                },
                {
                    name: 'Foreman',
                    attributes: {
                        department: 'Assembly',
                    },
                    children: [
                        {
                            name: 'Worker',
                        },
                    ],
                },
            ],
        },
    ],
};


export class FamilyTree extends React.Component {
    constructor(props) {
        super(props);
        this.transform = this.transform.bind(this);
        this.state = {};
        this.state.data = this.transform(this.props.data);
    }

    render() {
        return (
            <div id="treeWrapper" style={{width: '50em', height: '30em'}} className='center' >
                <Tree data={this.state.data} pathFunc='step' orientation='vertical' translate={{x: 100, y: 50}}
                      depthFactor={this.state.showChildren ? 100 : -100} separation={{siblings: 3}} />
            </div>
        );
    }

    transform(data) {
        let target = data.targets[0];
        let idName = new Map();
        let people = data.people;
        people.push(target);
        let targetId = target.id;
        // let targetId = 'WD-Q43274';
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
            this.state.showChildren = showChildrenExperimental;
            return res;

            function generateNodeHelper({id, depth = 0}={}) {
                let targetIds = targetMap.has(id) ? targetMap.get(id) : [];
                let targets = targetIds.map((id) => (generateNodeHelper({id: id, depth: depth + 1})));
                let depths = targets.map((x) => x.max_depth);
                let max_depth = depths.length > 0 ? Math.max(...depths) + 1 : depth;
                let res = {
                    name: idName.get(id),
                    children: targets,
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