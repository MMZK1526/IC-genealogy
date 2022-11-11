
import { Form } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import './Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';
import { Autocomplete, TextField } from '@mui/material';

export function Sidebar(props) {
    const allPersons = props.getAllPersons();

    return (
        <div className='sidebar'>
            <Form>
                <Form.Label className="label">Family: </Form.Label>
                <Multiselect
                    options={Array.from(props.filters.allFamilies).map((v) => ({name: v, id: v}))} // Options to display in the dropdown
                    selectedValues={Array.from(props.filters.families).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
                    onSelect={(_, i) => props.filters.families.add(i.name)} // Function will trigger on select event
                    onRemove={(_, i) => props.filters.families.delete(i.name)} // Function will trigger on remove event
                    displayValue='name' // Property name to display in the dropdown options
                />

                <Form.Group className='form-group' controlId='bloodline-checkbox'>
                    <Form.Check title='Bloodline' label='Bloodline only' type='checkbox' defaultChecked 
                    onChange={(e) => {
                        props.filters.bloodline = e.target.checked;
                    }}
                />
            </Form.Group>

                <Button onClick={() => props.onChange()}>
                    Apply
                </Button>
            </Form>

            <hr style={{
                background: 'darkgrey',
                height: '2px',
                width: '100%',
                border: 'none',
                margin: '20px 0px'
            }} />

            <label className="label">Look for name in tree: </label>
            <Autocomplete
                // disablePortal
                id="combo-box-demo"
                options={allPersons}
                getOptionLabel={(option) => option.name}
                onChange={props.onPersonSelection}
                sx={{ width: 300 }}
                renderInput={(params) => <TextField {...params} />}
            />
        </div>
    );
}
