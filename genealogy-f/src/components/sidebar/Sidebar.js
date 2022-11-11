
import { Form } from 'react-bootstrap';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import './Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';
import { Autocomplete, TextField } from '@mui/material';

const names = [
    { label: "Josef" },
    { label: "Vasily" },
];

export function Sidebar(props) {
  return (
    <div className='sidebar'>
      <Form>
        <Multiselect
            options={Array.from(props.filters.allFamilies).map((v) => ({name: v, id: v}))} // Options to display in the dropdown
            selectedValues={Array.from(props.filters.families).map((v) => ({name: v, id: v}))} // Preselected value to persist in dropdown
            onSelect={(_, i) => props.filters.families.add(i.name)} // Function will trigger on select event
            onRemove={(_, i) => props.filters.families.delete(i.name)} // Function will trigger on remove event
            displayValue='name' // Property name to display in the dropdown options
        />

        <Form.Group className='form-group' controlId='bloodline-checkbox'>
          <Form.Check title='Bloodline' label='Bloodline Only' type='checkbox' defaultChecked 
          onChange={(e) => {
            props.filters.bloodline = e.target.checked;
          }}
          />
        </Form.Group>

        <Autocomplete
            disablePortal
            id="combo-box-demo"
            options={names}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Search for name" />}
        />

        <Button onClick={() => props.onChange()}>
          Apply
        </Button>
      </Form>
    </div>
  );
}
