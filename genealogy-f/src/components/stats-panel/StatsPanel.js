import React from 'react';
import './StatsPanel.css';

export class StatsPanel extends React.Component {
    render() {
        return (
            <div className='stats-panel'>
                <button className='close-button' onClick={this.props.onClick}>x</button>
                {this.numberOfFamilyMembers()}
                {/*{this.avgChildrenPerPerson()}*/}
                {this.mostPopularCountryOfBirth()}
                {this.topFamilies()}
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

    mostPopularCountryOfBirth() {
        const arr = this.props.data.items.map((item) => this.getCountryOfBirth(item));
        const nonNullArr = arr.filter((x) => x !== null);
        const counts = new Map();
        for (const x of nonNullArr) {
            counts.set(x, counts.has(x) ? counts.get(x) + 1 : 1);
        }
        const countsArr = Array.from(counts.entries());
        countsArr.sort((x, y) => (y[1] - x[1]));
        console.assert(countsArr.length >= 1);
        const resCountry = countsArr[0][0];
        const resCount = countsArr[0][1];

        return (
            <div>
                <b>Most popular country of birth</b><br/>
                {resCountry} ({Math.round(resCount / nonNullArr.length * 100)}%)
            </div>
        );
    }

    topFamilies() {
        const arr = this.props.data.items.map((item) => this.getFamily(item));
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
                    <b>Most popular families</b>
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