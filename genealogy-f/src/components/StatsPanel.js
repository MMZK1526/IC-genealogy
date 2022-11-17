import React from 'react';
import './stylesheets/StatsPanel.css';
import CloseButton from 'react-bootstrap/CloseButton';

export class StatsPanel extends React.Component {
    constructor(props) {
        super(props);
        this.listCreator = this.listCreator.bind(this);
        this.getCountryOfBirth = this.getCountryOfBirth.bind(this);
        this.getFamily = this.getFamily.bind(this);
    }

    render() {
        return (
            <div className='stats-panel'>
                <CloseButton className='close-button' onClick={this.props.onClick}/>
                <div id='stat'>{this.numberOfFamilyMembers()}</div>
                {/*{this.avgChildrenPerPerson()}*/}
                <div id='stat'>{this.topCountriesOfBirth()}</div>
                <div id='stat'>{this.topFamilies()}</div>
            </div>
        );
    }

    numberOfFamilyMembers() {
        const total = this.calcTotalMembers();
        return (
            <div>
                <b>Number of family members:</b><br/>
                {total}
            </div>
        );
    }

    avgChildrenPerPerson() {
        const children = this.props.data.relations.filter((x) => (x.type === 'child')).length;
        const avgChildren = children / this.calcTotalMembers();
        return (
            <div>
                <b>Avg children per person:</b><br/>
                {avgChildren.toFixed(2)}
            </div>
        );
    }

    topCountriesOfBirth() {
        return this.listCreator(this.getCountryOfBirth, 'Most popular countries of birth');
    }

    topFamilies() {
        return this.listCreator(this.getFamily, 'Most popular families');
    }

    listCreator(propertyGetter, text) {
        const arr = Object.values(this.props.data.items).map((item) => propertyGetter(item));
        const nonNullArr = arr.filter((x) => x !== null);
        const counts = new Map();
        for (const x of nonNullArr) {
            counts.set(x, counts.has(x) ? counts.get(x) + 1 : 1);
        }
        const countsArr = Array.from(counts.entries());
        countsArr.sort((x, y) => (y[1] - x[1]));
        console.assert(countsArr.length >= 1);

        return (
            <div>
                <div>
                    <b>{text}</b>
                </div>
                {
                    countsArr.slice(0, 5).map((xy) => (
                        <div key={xy[0]}>
                            {xy[0]} ({Math.round(xy[1] / nonNullArr.length * 100)}%)
                        </div>
                    ))
                }
            </div>
        );
    }

    calcTotalMembers() {
        return this.props.data.items.length;
    }

    getCountryOfBirth(item) {
        const fullName = this.getProperty(item, 'place of birth');
        if (fullName === null) {
            return null;
        }
        return fullName.split(',').at(-1).trim();
    }

    getFamily(item) {
        return this.getProperty(item, 'family');
    }

    getProperty(item, property) {
        const filteredList = item.additionalProperties.filter((x) => (x.name === property));
        if (filteredList.length === 0) {
            return null;
        }
        console.assert(filteredList.length === 1);
        return filteredList[0].value;
    }
}
