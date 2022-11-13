import React from 'react';
import { Form } from 'react-bootstrap';
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
                    <Form.Check className="mt-3 mb-3" title='Bloodline' label='Bloodline only' type='checkbox' defaultChecked={props.filters.bloodline} 
                        onChange={(e) => {
                            props.filters.bloodline = e.target.checked;
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

            <hr style={{
                background: 'darkgrey',
                height: '2px',
                width: '100%',
                border: 'none',
                margin: '20px 0px'
            }} />

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
