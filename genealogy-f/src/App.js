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
        this.state = {value: '', disambiguationJson: '', relationsJson: ''};
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
                    {this.state.disambiguationJson
                        ? this.state.disambiguationJson
                        : 'No data fetched'
                    }
                </div>
                <div>
                    {this.state.relationsJson
                        ? this.state.relationsJson
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
                disambiguationJson: JSON.stringify(r)
            });
        });
        await this.requests.relations().then(r => {
            this.setState({
                relationsJson: JSON.stringify(r)
            });
        });
    }

}

export default App;
