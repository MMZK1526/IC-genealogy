import './stylesheets/Sidebar.css';
import { Autocomplete, TextField } from '@mui/material';
import { Row } from 'react-bootstrap';

export function TreeNameLookup(props) {
	const allPersonsRelations = props.getPersonsRelations();
	const personMap = props.getPersonMap();

	const getPersonalName = (key) => {
		return personMap.get(key).get("personal name");
	}

	return (
		<div className='sidebar pe-auto'>
			<label className="form-label">Look for name in tree: </label>
			<Autocomplete
				options={allPersonsRelations}
				getOptionLabel={(option) => `${option.name} (${getPersonalName(option.key)})@${option.key}`}
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

			<label className="form-label">Relationship with: </label>
			<Autocomplete
				options={allPersonsRelations}
				getOptionLabel={(option) => `${option.name} (${getPersonalName(option.key)})@${option.key}`}
				// value={allPersonsRelations.find(person => person.key === props.getAnotherPerson())}
				onChange={props.onAnotherPersonSelection}
				sx={{ width: '100%', backgroundColor: "white" }}
				renderInput={(params) => {
					params.inputProps.value = params.inputProps.value.split("@")[0];
					return (
					  <TextField {...params}/>
					);
				  }}
				renderOption={(props, option) => <li component="li" {...props}>{option.name}</li>}
			/>

			
			
			<div>
				{
				props.getAnotherPerson === null ?

				<label></label> : 
				
				<div>
					<label className="form-label">Is </label>
					{relaBetween(props.getFocusPerson(), props.getAnotherPerson)}
				</div>
				}
			</div>
			

		</div>
	);
}

function relaBetween(from, to) {
	return (
		<Row>
		<label>{from}</label>
		<label>{to}</label>
		</Row>
		
	);
}
