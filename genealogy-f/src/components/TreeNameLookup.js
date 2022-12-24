import './stylesheets/Sidebar.css';
import { Autocomplete, TextField } from '@mui/material';
import Button from 'react-bootstrap/Button';
import EscapeCloseableEnterClickable from "./EscapeCloseableEnterClickable";

// The panel to search for any people in the tree as well as the relationship between any two
export function TreeNameLookup(props) {
	const allPersonsRelations = props.getPersonsRelations();
	const personMap = props.getPersonMap();

	const getPersonalName = (key) => {
		return personMap.get(key).get("personal name");
	}

	return (
		<EscapeCloseableEnterClickable>
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
							<TextField {...params} />
						);
					}}
					renderOption={(props, option) => <li component="li" {...props}>{option.name}</li>}
				/>

				<label className="m-1 form-label">Relationship with: </label>
				<Autocomplete
					options={props.allPeople}
					getOptionLabel={(option) => `${option.name} (${option.additionalProperties
						.filter((p) => p.name === 'personal name').map(p => p.value)})@${option.id}`}
					onChange={props.onAnotherPersonSelection}
					sx={{ width: '100%', backgroundColor: "white" }}
					renderInput={(params) => {
						params.inputProps.value = params.inputProps.value.split("@")[0];
						return (
							<TextField {...params} />
						);
					}}
					renderOption={(props, option) => <li component="li" {...props}>{option.name}</li>}
				/>

				<Button className='mt-3 text-center w-100' variant="success" onClick={() => props.onChange(false)}>
					Apply
				</Button>
			</div>
		</EscapeCloseableEnterClickable>
	);
}
