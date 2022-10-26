import React from 'react';
import App from './components/App/App';
import averageTree from 'relatives-tree/samples/average-tree.json';
import baz from './relations.json';

export class Adapter extends React.Component {
    transform(data) {
        return baz;
    }

    render() {
        return (
            <App nodes={this.transform(this.props.data)} />
        );
    }
}