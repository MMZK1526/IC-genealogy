import React from "react";
import {Button, Form, InputGroup} from "react-bootstrap"
import {MdOutlinePersonSearch} from "react-icons/md"
import {Navigate} from "react-router-dom";
import './NameSearch.css'
import _ from "lodash";
import {CustomUpload} from "../custom-upload/CustomUpload";
import {Utils} from '../utils';
import Stack from 'react-bootstrap/Stack';
import Spinner from 'react-bootstrap/Spinner';

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
            <div className="m-5">
            <Stack gap={5} className="text-center justify-content-center">
                <h1 className='mt-5'>Ancesta - Genealogy Project</h1>
                <Form onSubmit={this.handleChangeInitialName} className="w-50 m-auto">
                    <InputGroup>
                        <MdOutlinePersonSearch size={50} color='darkslategray'/>
                        <Form.Control
                            aria-label="Example text with button addon"
                            aria-describedby="search-button"
                            id='search-bar'
                            type="text"
                            className="fs-3"
                            placeholder="Search a name to start..."
                            onChange={this.handleChangeInitialName}
                        />
                        <Button 
                            variant="primary" 
                            id="search-button" 
                            disabled={this.state.isLoading} 
                            onClick={this.handleSearchSubmit}
                            className="fs-4">
                            {this.state.isLoading &&
                                <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                              />
                            }
                            Search
                        </Button>
                        
                    </InputGroup>
                </Form>
                {
                    !this.state.isLoading &&
                    <CustomUpload onSubmit={this.handleCustomUpload}/>
                }
            </Stack>
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
