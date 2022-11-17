import React from 'react';
import './stylesheets/Sidebar.css';
import { Autocomplete, TextField } from '@mui/material';

export function TreeNameLookup(props) {
    const allPersonsRelations = props.getPersonsRelations();

    // console.log(allPersons);
    return (
        <div className='sidebar pe-auto'>
            <label className="form-label">Look for name in tree: </label>
            <Autocomplete
                options={allPersonsRelations}
                getOptionLabel={(option) => `${option.name}@${option.key}`}
                value={allPersonsRelations.find(person => person.key === props.getFocusPerson())}
                onChange={props.onPersonSelection}
                sx={{ width: '100%', backgroundColor: "white" }}
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
