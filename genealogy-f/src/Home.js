import React from "react";
import { NameSearch } from './components/NameSearch.js';

export class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            initialName: ''
        };
        this.requests = this.props.requests;
    }

    componentDidMount() {
        document.title = "Ancesta - Genealogy Project";
    }

    render() {
        return (
            <NameSearch
                requests={this.requests}
            />
        );
    }
}
