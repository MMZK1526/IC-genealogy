import React from 'react';
import { Form } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import './stylesheets/Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';

export function Sidebar(props) {
    const style = {
        searchBox: { // To change search box element look
            'fontSize': '20px',
            'border': '1px solid',
        },
    };

    return (
        <div className='sidebar pe-auto'>
            <Form className="w-100 mb-3 overflow-auto" style={{ maxHeight: "44vh" }}>
                {/* <Form.Group className="form-group"  controlId='Name-control'>
                    <Form.Label>Personal Name</Form.Label>
                    <Form.Control type='text' placeholder="e.g. Charles" 
                    onChange={(e) => {
                        props.filters.personalName = e.target.value;
                    }}
                    />
                </Form.Group> */}

                <Form.Label className="form-label">Family: </Form.Label>
                <Multiselect
                    id='family-select'
                    options={Array.from(props.filters.allFamilies).sort().map((v) => ({name: v, id: v}))} // Options to display in the dropdown
                    selectedValues={Array.from(props.filters.families).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
                    onSelect={(_, i) => props.filters.families.add(i.name)} // Function will trigger on select event
                    onRemove={(_, i) => props.filters.families.delete(i.name)} // Function will trigger on remove event
                    displayValue='name' // Property name to display in the dropdown options
                    style={style}
                />

                <Form.Group className='form-group' controlId='bloodline-checkbox'>
                    <Form.Check className="mb-1" title='Bloodline' label='Bloodline only' type='checkbox' defaultChecked={props.filters.bloodline} 
                        onChange={(e) => {
                            props.filters.bloodline = e.target.checked;
                        }}
                    />
                </Form.Group>

                <Form.Label className="form-label">Place Of Birth: </Form.Label>
                <Multiselect
                    id='pob-select'
                    options={Array.from(props.filters.allBirthPlaces).sort().map((v) => ({name: v, id: v}))} // Options to display in the dropdown
                    selectedValues={Array.from(props.filters.birthPlaces).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
                    onSelect={(_, i) => props.filters.birthPlaces.add(i.name)} // Function will trigger on select event
                    onRemove={(_, i) => props.filters.birthPlaces.delete(i.name)} // Function will trigger on remove event
                    displayValue='name' // Property name to display in the dropdown options
                    style={style}
                />

                <Form.Label className="form-label">Place Of Death: </Form.Label>
                <Multiselect
                    id='pod-select'
                    options={Array.from(props.filters.allDeathPlaces).sort().map((v) => ({name: v, id: v}))} // Options to display in the dropdown
                    selectedValues={Array.from(props.filters.deathPlaces).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
                    onSelect={(_, i) => props.filters.deathPlaces.add(i.name)} // Function will trigger on select event
                    onRemove={(_, i) => props.filters.deathPlaces.delete(i.name)} // Function will trigger on remove event
                    displayValue='name' // Property name to display in the dropdown options
                    style={style}
                />

                <Form.Group className="mb-1" controlId='fromYear-control'>
                    <Form.Label>From</Form.Label>
                    <Form.Control type='text' placeholder="Year of Birth, e.g. 1900" 
                    onChange={(e) => {
                        props.filters.fromYear = e.target.value;
                    }}
                    />
                </Form.Group>

                <Form.Group className="mb-1"  controlId='toYear-control'>
                    <Form.Label>To</Form.Label>
                    <Form.Control type='text' placeholder="Year of Birth, e.g. 1990" 
                    onChange={(e) => {
                        props.filters.toYear = e.target.value;
                    }}
                    />
                </Form.Group>

            </Form>

            <Button className='m-1 text-center w-100' variant="primary" onClick={() => props.onChange()}>
                Apply
            </Button>
            <Button className='m-1 text-center w-100' variant="danger" onClick={() => props.onPrune()}>
                Prune
            </Button>
        </div>
    );
}
