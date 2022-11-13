import React from "react";
import {Button, Form} from "react-bootstrap"
import {MdOutlinePersonSearch} from "react-icons/md"
import ClipLoader from 'react-spinners/ClipLoader';
import {Navigate} from "react-router-dom";
import './NameSearch.css'
import _ from "lodash";
import {CustomUpload} from "../custom-upload/CustomUpload";
import {Utils} from '../utils';

export class NameSearch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            initialName: '',
            result: null,
            isLoading: false,
            showTree: false,
        };
        this.requests = this.props.requests;
        this.id = null;
        this.relations = null;
        this.utils = new Utils();
    }

    render() {
        if (this.state.result) {
            return (<Navigate to="/result" replace={true} state={{result: this.state.result}}/>);
        }
        if (this.state.showTree) {
            return (<Navigate to="/tree" replace={true} state={{source: this.id, relations: this.relations}}/>);
        }
        return (
            <div>
                <form className='welcome' onSubmit={this.handleChangeInitialName}>
                    <div id='title'>Ancesta - Genealogy Project</div>
                    <br></br>
                    <div id='search'>
                        <MdOutlinePersonSearch size={50} color='darkslategray'/>
                        <Form.Control
                            id='search-bar'
                            type="text"
                            placeholder="Search a name to start..."
                            onChange={this.handleChangeInitialName}
                        />
                        {!this.state.isLoading
                            ? <Button
                                type='primary'
                                size='lg'
                                onClick={this.handleSearchSubmit}>
                                Search</Button>
                            : <div><ClipLoader
                                className={
                                    'spinner'
                                }
                                color='#0000ff'
                                cssOverride={{
                                    display: 'block',
                                    margin: '0 auto',
                                }}
                                size={75}
                            /></div>
                        }
                    </div>
                </form>
                {
                    !this.state.isLoading &&
                    <CustomUpload onSubmit={this.handleCustomUpload}/>
                }
            </div>
        );
    }

    handleChangeInitialName = (event) => {
        this.setState({initialName: event.target.value});
    }

    handleCustomUpload = async (data) => {
        const res = await this.utils.processRelations(data);
        this.id = res.id;
        this.relations = res.data;
        this.setState({showTree: true});
    }

    handleSearchSubmit = async (event) => {
        event.preventDefault();

        if (this.state.initialName === '') {
            alert("Please enter a name!");
            return;
        }

        this.setState({
            isLoading: true,
        });

        await this.requests.search(this.state.initialName).then(r => {
            if (Object.values(r).length === 0) {
                alert("Person not found!");
                return;
            }

            this.setState({result: r});
        });
    }
}
