import { Container, Form } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import './stylesheets/Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';
import EscapeCloseableEnterClickable from "./EscapeCloseableEnterClickable";

// Render the filter panel
export function TreeFilter(props) {
	const style = {
		searchBox: {
			'fontSize': '20px',
			'border': '1px solid',
		},
	};

	// Clear all selections
	const clearSelections = () => {
		for (let key of Object.keys(props.filters.textFilters)) {
			props.filters.textFilters[key].choice.clear();
		}

		// Reset to bloodline only
		props.filters.bloodline = true;

		props.onChange(true /* true for resetting */);
	}

	return (
		<EscapeCloseableEnterClickable>
			<div className='sidebar pe-auto'>
				<Form className="w-100 mb-3 overflow-auto" style={{ maxHeight: "44vh" }}>
					<Form.Label className="form-label">Family: </Form.Label>
					<Multiselect
						// Filter for families
						id='family-select'
						options={Array.from(props.filters.textFilters['WD-P53'].all).sort().map((v) => ({
							name: v,
							id: v
						}))} // Options to display in the dropdown
						selectedValues={Array.from(props.filters.textFilters['WD-P53'].choice).map((v) => ({
							name: v,
							id: v
						}))} // Preselected value to persist in dropdown
						// Function will trigger on select event
						onSelect={(_, i) => props.filters.textFilters['WD-P53'].choice.add(i.name)}
						// Function will trigger on remove event
						onRemove={(_, i) => props.filters.textFilters['WD-P53'].choice.delete(i.name)}
						displayValue='name' // Property name to display in the dropdown options
						style={style}
					/>

					<Form.Group className='form-group' controlId='bloodline-checkbox'>
						<Form.Check className="mb-1" title='Bloodline' label='Bloodline only' type='checkbox'
							// Filter for bloodline (only blood relatives to the root)
							defaultChecked={props.filters.bloodline}
							onChange={(e) => {
								props.filters.bloodline = e.target.checked;
							}}
						/>
					</Form.Group>

					<Form.Group className='form-group' controlId='hiddenPeople-checkbox'>
						<Form.Check className="mb-1" title='Hide' label='Hide uninterested' type='checkbox'
							// Filter to remove people deliberately hidden by the user
							defaultChecked={props.filters.removeHiddenPeople}
							onChange={(e) => {
								props.filters.removeHiddenPeople = e.target.checked;
							}}
						/>
					</Form.Group>

					<Form.Label className="form-label">Place Of Birth: </Form.Label>
					<Multiselect
						// Filter by place of birth
						id='pob-select'
						options={Array.from(props.filters.textFilters['SW-P2'].all).sort().map((v) => ({
							name: v,
							id: v
						}))} // Options to display in the dropdown
						selectedValues={Array.from(props.filters.textFilters['SW-P2'].choice).map((v) => ({
							name: v,
							id: v
						}))} // Preselected value to persist in dropdown
						// Function will trigger on select event
						onSelect={(_, i) => props.filters.textFilters['SW-P2'].choice.add(i.name)}
						// Function will trigger on remove event
						onRemove={(_, i) => props.filters.textFilters['SW-P2'].choice.delete(i.name)}
						displayValue='name' // Property name to display in the dropdown options
						style={style}
					/>

					<Form.Label className="form-label">Place Of Death: </Form.Label>
					<Multiselect
						// Filter by place of death
						id='pod-select'
						options={Array.from(props.filters.textFilters['SW-P3'].all).sort().map((v) => ({
							name: v,
							id: v
						}))} // Options to display in the dropdown
						selectedValues={Array.from(props.filters.textFilters['SW-P3'].choice).map((v) => ({
							name: v,
							id: v
						}))} // Preselected value to persist in dropdown
						// Function will trigger on select event
						onSelect={(_, i) => props.filters.textFilters['SW-P3'].choice.add(i.name)}
						// Function will trigger on remove event
						onRemove={(_, i) => props.filters.textFilters['SW-P3'].choice.delete(i.name)}
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

					<Form.Group className="mb-1" controlId='toYear-control'>
						<Form.Label>To</Form.Label>
						<Form.Control type='text' placeholder="Year of Birth, e.g. 1990"
							onChange={(e) => {
								props.filters.toYear = e.target.value;
							}}
						/>
					</Form.Group>

					<Form.Label className="form-label">Always Show: </Form.Label>
					<Multiselect
						// Filter for the list of people that the user want them to be always visible
						id='pob-always-show'
						options={props.allPeople.map((id) => ({
							name: id.name,
							id: id.id
						}))} // Options to display in the dropdown
						selectedValues={props.allPeople.filter(id =>
							props.filters.alwaysShownPeople.has(id.id)).map((id) => ({
								name: id.name,
								id: id.id
							}))
						} // Preselected value to persist in dropdown
						// Function will trigger on select event
						onSelect={(_, i) => props.filters.alwaysShownPeople.add(i.id)}
						// Function will trigger on remove event
						onRemove={(_, i) => props.filters.alwaysShownPeople.delete(i.id)}
						displayValue='name' // Property name to display in the dropdown options
						style={style}
					/>

					<Form.Group className='form-group mt-2' controlId='family-member-checkbox'>
						<Form.Check className="mb-1" title='Filter By Family' label={"Filter by Family: show families that has at least one family member satisfying the filters above."} type='checkbox'
							// Filter for bloodline (only blood relatives to the root)
							defaultChecked={false}
							onChange={(e) => {
							}}
						/>
					</Form.Group>
					<Container>For example, to show a royal family tree, we can choose 'monarch' in the Occupation filter and tick the box above.</Container>

				</Form>

				<Button className='m-1 text-center w-100' variant="success" onClick={() => props.onChange(false)}>
					Apply
				</Button>
				<Button className='m-1 text-center w-100' variant="primary" onClick={() => clearSelections()}>
					Reset
				</Button>
				<Button className='mt-4 m-1 text-center w-100' variant="danger" onClick={() => props.onPrune()}>
					Prune
				</Button>
			</div>
		</EscapeCloseableEnterClickable>
	);
}

// TODO: Alert-box on pruning
