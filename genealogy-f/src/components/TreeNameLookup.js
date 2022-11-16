import React from 'react';
import './stylesheets/Sidebar.css';
import { Autocomplete, TextField } from '@mui/material';

export function TreeNameLookup(props) {
    const allPersons = props.getAllPersons();

    return (
        <div className='sidebar pe-auto'>
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
