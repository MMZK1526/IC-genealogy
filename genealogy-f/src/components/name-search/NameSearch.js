import React from "react";
import {Button, Form} from "react-bootstrap"
import {MdOutlinePersonSearch} from "react-icons/md"
import './NameSearch.css'

export function NameSearch(props) {
    return (
        <div className='welcome' onSubmit={props.onClick}>
            <div id='title'>Ancesta - Genealogy Project</div>
            <div id='search'>
                <MdOutlinePersonSearch size={50} color='darkslategray'/> 
                <Form.Control
                    id='search-bar'
                    type="text"
                    placeholder="Search a name to start..."
                    onChange={props.onChange}
                />
                <Button
                    className='search-button'
                    type='primary'
                    onClick={props.onClick}
                >
                    Search
                </Button>
            </div>
        </div>
    );
}