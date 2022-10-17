import './App.css';
import {Requests} from './requests';
import React from "react";

class App extends React.Component {
    render() {
        return (
            <NameForm/>
        );
    }
}

class NameForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {value: '', json: ''};
        this.requests = new Requests();

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    render() {
        return (
            <div>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        Name:
                        <input type="text" value={this.state.value} onChange={this.handleChange}/>
                    </label>
                    <input type="submit" value="Submit"/>
                </form>
                <div>
                    {this.state.json
                        ? this.state.json
                        : 'No data fetched'
                    }
                </div>
            </div>
        );
    }

    async handleSubmit(event) {
        event.preventDefault();
        await this.requests.search(this.state.value).then(r => {
            this.setState({
                json: JSON.stringify(r)
            });
        });
    }

}

export default App;
