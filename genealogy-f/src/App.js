import _ from "lodash";
import { Requests } from './components/requests';
import { Home } from './Home';
import './stylesheets/App.css';

import ResultPage from "./components/ResultPage.js";
import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";
import * as util from 'util';

import GenogramTree from "./GenogramTree/GenogramTree";
import { SnackbarProvider } from 'notistack';

class App extends React.Component {
    componentDidMount() {
        document.title = "Ancesta - Genealogy Project";
    }

    constructor(props) {
        super(props);
        this.state = {
            chosenId: '',
        };
        // window.onerror = (event, source, lineno, colon, error) => {
        //     alert(event);
        // }
        this.initialState = JSON.parse(JSON.stringify(this.state));
        this.requests = new Requests();

        // TODO: relocate
        this.handleCustomUpload = this.handleCustomUpload.bind(this);
        this.handlePopupNew = this.handlePopupNew.bind(this);
    }


    render() {
        return (
            <div className="App">
                <SnackbarProvider>
                    <link
                        rel="stylesheet"
                        href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css"
                        integrity="sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi"
                        crossOrigin="anonymous"
                    />
                    <Router>
                        <Routes>
                            <Route path="/" element={<Home requests={this.requests} />} />
                            <Route path="/result" element={<ResultPage requests={this.requests} />} />
                            <Route path="/tree" element={<GenogramTree requests={this.requests} onPopupExtend={this.handlePopupExtend} />} />
                        </Routes>
                    </Router>
                </SnackbarProvider>
            </div>
        );
    }

    setStatePromise = util.promisify(this.setState);

    // TODO: relocate to [appropriate place]
    async handleCustomUpload(data) {
        const chosenId = data.targets[0].id;
        await this.hideTree();
        await this.setRelationCalc(chosenId, data);
        await this.unhideTree();
    }

    // TODO: relocate to GenogramTree
    async handlePopupNew(id) {
        await this.fetchRelationsAndRender(id);
    }
}

export default App;
