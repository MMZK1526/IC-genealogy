import React from 'react';
import App from './components/App/App';
import averageTree from 'relatives-tree/samples/average-tree.json';
import baz from './relations.json';
import './Adapter.css';

export class Adapter extends React.Component {
    transform(data) {
        const foo = data.items.map((x) => (
            {
                id: x.id,
                gender: this.getGender(x),
                parents: [],
                siblings: [],
                spouses: [],
                children: []

            }));
        const bar = new Map();
        for (const x of foo) {
            bar.set(x.id, x);
        }
        const relations = data.relations;
        for (const r of relations) {
            const id1 = r.item1Id;
            const id2 = r.item2Id;
            const type = this.sanitizeRelation(r['type']);
            const reverseType = this.getReverseRelation(type);
            let x1 = bar.get(id1);
            let x2 = bar.get(id2);
            bar.set(id1, this.addRelation(x1, id2, type));
            bar.set(id2, this.addRelation(x2, id1, reverseType));
        }
        const res = Array.from(bar.values());
        return res;
    }

    getGender(x) {
        const filteredProperties = x.additionalProperties.filter((x) => x.name === 'gender');
        console.assert(filteredProperties.length > 0);
        const gender = filteredProperties[0].value;
        return (
            gender.value === 'F'
            ? 'female'
                : gender.value === 'M'
                    ? 'male'
                        : 'non-binary'
        );
    }

    sanitizeRelation(r) {
        switch(r) {
            case 'father':
            case 'mother':
                return 'parent';
            default:
                return r;
        }
    }

    getReverseRelation(r) {
        switch(r) {
            case 'parent':
                return 'child';
            case 'child':
                return 'parent';
            case 'spouse':
                return 'spouse';
            case 'sibling':
                return 'sibling';
            default:
                throw 'Unrecognized relation type';
        }
    }

    addRelation(target, id, r) {
        let x = target;
        let arr = x[this.getFieldNameFromRelation(r)];
        arr.push({
            id: id,
            type: r === 'spouse' ? 'married' : 'blood'
        });
        x[r] = arr;
        return x;
    }

    getFieldNameFromRelation(r) {
        switch(r) {
            case 'parent':
                return 'parents';
            case 'sibling':
                return 'siblings';
            case 'spouse':
                return 'spouses';
            case 'child':
                return 'children';
            default:
                throw 'Unrecognized relation';
        }
    }

    render() {
        return (
            <div className='foo'>
                <App nodes={this.transform(this.props.data)} />
            </div>
        );
    }
}