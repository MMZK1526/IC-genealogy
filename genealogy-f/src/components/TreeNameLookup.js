import './stylesheets/Sidebar.css';
import React from 'react';
import Container from 'react-bootstrap/Container';
import { Autocomplete, TextField } from '@mui/material';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import EscapeCloseableEnterClickable from "./EscapeCloseableEnterClickable";

const showResults = 0;
const noResult = 1;
const loading = 2;
const noRelationship = 3;

// The panel to search for any people in the tree as well as the relationship between any two
export function TreeNameLookup(props) {
	const [isExisting, setIsExisting] = React.useState(true);
	const [inputValue, setInputValue] = React.useState('');
	const [searchResult, setSearchResult] = React.useState([]);
	const [oldInputValue, setOldInputValue] = React.useState('');
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
					className='mb-2'
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
					className='mb-2'
					inputValue={inputValue}
					onInputChange={(event, newInputValue, reason) => {
						if (reason === 'input' || (event !== null && event.type === 'click')) {
							setOldInputValue(newInputValue);
						}
						if (reason === 'reset' && (event === null || event.type !== 'click')) {
							setIsExisting(false);
							setInputValue(oldInputValue);
						} else {
							setIsExisting(true);
							setInputValue(newInputValue);
						}
					}}
					noOptionsText={"No Options; Click 'Search' below to attempt a search"}
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

				<Button className='mt-1 text-center w-100' variant="success" onClick={async () => {
					if (isExisting) {
						setSearchResult([]);
						props.onChange(false);
					} else {
						// Search for new people
						await props.requests.search(oldInputValue).then(r => {
							if (Object.values(r).length === 0) {
								alert("Person not found!");
							} else {
								console.log(r);
							}
							setSearchResult(r);
						});
					}
				}}>
					Search
				</Button>

				{searchResult.length === 0 ?
					<div></div>
					: <Container className="ml-5 overflow-auto additional-properties-container"
						style={{ height: '35vh' }}>
						{searchResult.map((entry) => (<Row key={entry.id}
							className='mt-2 text-center'>
							<Button onClick={async () => {
								let result = await props.requests.relations({ id: entry.id, depth: 2, visitedItems: [], allSpouses: true });
								if (props.allPeople.some((p) => result.items[p.id] !== undefined)) {
									props.onSearchNew(result, entry.id);
								}
							}}>
								{entry.name + ": " + entry.description}
							</Button>
						</Row>))}</Container>}
			</div>
		</EscapeCloseableEnterClickable>
	);
}
