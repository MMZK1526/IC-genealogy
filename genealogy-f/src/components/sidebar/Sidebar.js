import React from 'react';
import { Form, Modal } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import './Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';
import { Autocomplete, TextField } from '@mui/material';

export function Sidebar(props) {
    const allPersons = props.getAllPersons();
    const style = {
        searchBox: { // To change search box element look
            'height': '50px',
            'fontSize': '20px',
            'border': '1px solid',
        },
    };

    return (
        <div className='sidebar'>
            <Form className="w-100">
                <Form.Group className="form-group"  controlId='Name-control'>
                    <Form.Label>Personal Name</Form.Label>
                    <Form.Control type="name" placeholder="Charles" 
                    onChange={(e) => {
                        props.filters.personalName = e.target.value;
                    }}
                    />
                </Form.Group>

                <Form.Label className="form-label">Family: </Form.Label>
                <Multiselect
                    id='family-select'
                    options={Array.from(props.filters.allFamilies).map((v) => ({name: v, id: v}))} // Options to display in the dropdown
                    selectedValues={Array.from(props.filters.families).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
                    onSelect={(_, i) => props.filters.families.add(i.name)} // Function will trigger on select event
                    onRemove={(_, i) => props.filters.families.delete(i.name)} // Function will trigger on remove event
                    displayValue='name' // Property name to display in the dropdown options
                    style={style}
                />

                <Form.Group className='form-group' controlId='bloodline-checkbox'>
                    <Form.Check className="mt-1 mb-1" title='Bloodline' label='Bloodline only' type='checkbox' defaultChecked={props.filters.bloodline} 
                        onChange={(e) => {
                            props.filters.bloodline = e.target.checked;
                        }}
                    />
                </Form.Group>

                <Form.Group className="mb-1" controlId='fromYear-control'>
                    <Form.Label>From</Form.Label>
                    <Form.Control type="fromYear" placeholder="Year of Birth, e.g. 1900" 
                    onChange={(e) => {
                        props.filters.fromYear = e.target.value;
                    }}
                    />
                </Form.Group>

                <Form.Group className="mb-1"  controlId='toYear-control'>
                    <Form.Label>To</Form.Label>
                    <Form.Control type="toYear" placeholder="Year of Birth, e.g. 1990" 
                    onChange={(e) => {
                        props.filters.toYear = e.target.value;
                    }}
                    />
                </Form.Group>

                <Form.Group className="mb-1" controlId='birthPlace-control'>
                    <Form.Label>Place of Birth</Form.Label>
                    <Form.Control type="fromYear" placeholder="Place of Birth, e.g. London" 
                    onChange={(e) => {
                        props.filters.birthPlace = e.target.value;
                    }}
                    />
                </Form.Group>

                <Form.Group className="mb-1"  controlId='DeathPlace-control'>
                    <Form.Label>Place of Death</Form.Label>
                    <Form.Control type="toYear" placeholder="Place of Death, e.g. Windsor" 
                    onChange={(e) => {
                        props.filters.deathPlace = e.target.value;
                    }}
                    />
                </Form.Group>


                <div>
                <Button className='m-1 text-center w-100' variant="primary" onClick={() => props.onChange()}>
                    Apply
                </Button>
                </div><div>
                <Button className='m-1 text-center w-100' variant="danger" onClick={() => props.onPrune()}>
                    Prune
                </Button>
                </div>
            </Form>

            {/* <hr style={{
                background: 'darkgrey',
                height: '2px',
                width: '100%',
                border: 'none',
                margin: '20px 0px'
            }} /> */}

            <label className="form-label">Look for name in tree: </label>
            <Autocomplete
                options={allPersons}
                getOptionLabel={(option) => `${option.name}@${option.key}`}
                value={allPersons.find(person => person.key === props.getFocusPerson())}
                onChange={props.onPersonSelection}
                sx={{ width: 300 }}
                renderInput={(params) => {
                    params.inputProps.value = params.inputProps.value.split("@")[0];
                    return (
                      <TextField {...params}/>
                    );
                  }}
                renderOption={(props, option) => <li component="li" {...props}>{option.name}</li>}
            />

        </div>
    );
}
