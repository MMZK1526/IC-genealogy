import React from 'react';
import App from './components/App/App';
import averageTree from 'relatives-tree/samples/average-tree.json';
import baz from './relations.json';
import './Adapter.css';

export class Adapter extends React.Component {
    transform(data) {
        const foo = data.items.map((x) => {
            let res = {
                id: x.id,
                name: x.name,
                gender: this.getGender(x),
                parents: new Map(),
                siblings: new Map(),
                spouses: new Map(),
                children: new Map(),
                additionalProperties: {
                    description: x.description,
                    aliases: x.aliases
                }
            };
            let additionalProperties = x.additionalProperties;
            const resProperties = res.additionalProperties;
            for (const p of additionalProperties) {
                resProperties[p.name] = p.value;
            }
            res.additionalProperties = resProperties;
            return res;
        });
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
        const arr = Array.from(bar.values());
        const res = arr.map((x) => {
            const y = x;
            y.parents = Array.from(y.parents.values());
            y.siblings = Array.from(y.siblings.values());
            y.spouses = Array.from(y.spouses.values());
            y.children = Array.from(y.children.values());
            return y;
        });
        return arr;
    }

    getGender(x) {
        const filteredProperties = x.additionalProperties.filter((x) => x.name === 'gender');
        console.assert(filteredProperties.length > 0);
        const gender = filteredProperties[0].value;
        return (
            gender === 'Female'
            ? 'female'
                : gender === 'Male'
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
        const x = target;
        const fieldName = this.getFieldNameFromRelation(r);
        const foo = x[fieldName];
        foo.set(id, {
            id: id,
            type: r === 'spouse' ? 'married' : 'blood'
        });
        console.assert(fieldName === 'parents' && foo.size <= 2 || fieldName !== 'parents');
        if (!(fieldName === 'parents' && foo.size <= 2 || fieldName !== 'parents')) {
            console.log(foo);
        }
        x[fieldName] = foo;
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