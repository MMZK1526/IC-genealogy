import { relMap, setRelMap } from './Const.js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Opacity } from './Const';

export function ndb(d) {
    return d[0] == '-' ? '-00' + d.substring(1) : d;
}

export function applyFamilyFilter(id, familyName, idPerson) {
    if (familyName == '') {
        return true;
    }
    const target = idPerson.id;
    if (target == null) {
        return false;
    }
    toLin
    const addProps = target.additionalProperties;
    // can we make this generic in the future // TODO: WE WILL
    const family = addProps.filter(p => p.name == 'family');
    if (family[0] == null || family[0].length == 0 || family[0].value == null) {
        return false;
    }
    return family.some((x) => x.value.toLowerCase().includes(familyName.toLowerCase()));
}

export function transform(data) {
    setRelMap(new Map());

    Object.values(data.items).forEach((person) => {
        let singlePerson = new Map();
        let hasGender = false;
        for (let attr of person.additionalProperties) {
            if (attr.name === 'gender') {
                // assumption that someone with unknown gender will always be at the boundary of a 
                // graph as otherwise their gender can be determined.
                if (attr.value == 'male' || attr.value == 'female') {
                    hasGender = true;
                    singlePerson.set('gender', attr.value);
                }
            }
        }
        if (!hasGender) {
            singlePerson.set('gender', 'unknown')
        }

        singlePerson.set('key', person.id);
        singlePerson.set('name', person.name);
        singlePerson.set('spouse', []);
        singlePerson.set('opacity', person.opacity);
        singlePerson.set('originalOpacity', person.originalOpacity);
        relMap.set(person.id, Object.fromEntries(singlePerson));
    });

    for (const [key, relations] of Object.entries(data.relations)) {
        var sourceItem = data.items[key];
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

    // add unknown nodes for unknown parent
    for (let key of relMap.keys()) {
        let r = relMap.get(key);
        setRelMap(addUnknown(r, relMap));
    }

    // convert map into array
    for (let key of relMap.keys()) {
        newOutput.push(relMap.get(key));
    }

    return newOutput;

}

function addUnknown(mfs, relMap) {
    if (mfs.mother && !mfs.father) {
        let newF = { key: '_' + mfs.mother, name: 'unknown', gender: 'male', opacity: Opacity.hidden };
        // marry parent to unknown and set child parent to unknown
        newF.spouse = [mfs.mother];
        mfs.father = newF.key;
        relMap.set(newF.key, newF);
        relMap.set(mfs.key, mfs);
    }

    // case of unknown mother - temporarily replace with 'unknown' node
    if (!mfs.mother && mfs.father) {
        let newM = { key: '_' + mfs.father, name: 'unknown', gender: 'female', opacity: Opacity.hidden };
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
export function getPersonMap(data, allRelations) {
    let personMap = new Map;
    for (let person of data) {
        const personId = person.id;
        let attributes = new Map;
        attributes.set('id', personId);
        attributes.set('name', person.name);

        if (person.description !== '') {
            attributes.set('description', person.description);
        }

        let person_relations = allRelations[personId];

        let attrMap = new Map;
        if (person_relations !== undefined) {
            for (let rela of person_relations) {
                let targetName = data.filter((p) => p.id == rela.item1Id)[0].name;
                if (attrMap.has(rela.type)) {
                    attrMap.set(rela.type, attrMap.get(rela.type) + ", " + targetName)
                } else {
                    attrMap.set(rela.type, targetName);
                }
            }
        }

        // wash data for additionalProperties
        for (let attr of person.additionalProperties) {
            // If field doesn't present, don't put in the Map
            if (attr.value === null || attr.value === '') continue;
            if (attr.propertyId === 'WD-P19' || attr.propertyId === 'WD-P20') continue;
            // this two fields not show, use personal name instead
            if (attr.name === 'family name' || attr.name === 'given name') continue;
            // Ignore ID values that are not parsed successfully in the back-end
            if (attr.value.includes('.well-known')) continue;

            if (attrMap.has(attr.name)) {
                let newVal = attrMap.get(attr.name) + '; ' + attr.value;
                attrMap.set(attr.name, newVal);
            } else {
                attrMap.set(attr.name, attr.value);
            }
        }

        if (person.kinships !== undefined) {
            for (let attr of person.kinships) {
                if (attrMap.has('kinship')) {
                    attrMap.get('kinship').push(attr);
                } else {
                    attrMap.set('kinship', [attr]);
                }
            }
        }

        attrMap.forEach((value, key) => {
            let newVal;
            switch (key) {
                case 'date of birth':
                    newVal = ndb(value.split('T')[0]);
                    break;
                case 'date of death':
                    newVal = ndb(value.split('T')[0]);
                    break;
                default:
                    newVal = value;
            }
            attributes.set(key, newVal);
        });

        personMap.set(personId, attributes);
    }
    return personMap;
}

export function withRouter(Component) {
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
