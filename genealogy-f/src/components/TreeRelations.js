import './stylesheets/PopupInfo.css';
import EscapeCloseableEnterClickable from './EscapeCloseableEnterClickable';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import { Utils } from './Utils';

// Show relations from the selected users (e.g. their parents, spouse etc.)
export function TreeRelations(props) {
	/// If the search result contains people that are not in the graph, we ask the user if they'd
	/// like a re-render and show those people
	if (props.relSearchState[0] === 1) {
		return (
			<div className='popup-inner w-50'>
				<EscapeCloseableEnterClickable onClick={props.closeRelSearchResult}>
					<CloseButton className='close-btn' onClick={props.closePopUp} />
					<Button
						className='text-start'
						variant='link'
						onClick={() => {
							props.relSearchState[0] = 2;
							props.closePopUp();
						}}>{'This relation contains people that are not in the graph. Click me to show them.'}
					</Button>
				</EscapeCloseableEnterClickable>
			</div >
		);
	}

	return (
		<div className='popup-inner w-50 overflow-auto' style={{ maxHeight: "50%" }}>
			<EscapeCloseableEnterClickable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getRelationFields(props.info, props.highlight, props.closePopUp)}
			</EscapeCloseableEnterClickable>
		</div >
	);

	function getRelationFields(data, highlight, close) {
		// Show all the relation fields, including parents, spouses, children, and relation to the root
		// The value for relation to the root is an array, and we render it differently since they are
		// clickable
		return Object.keys(Object.fromEntries(data)).filter((k) =>
			Utils.relationsKeywords.includes(k)).map((k) => (
				<Row key={'Row ' + k}>
					<Col xs={4} key={k}>
						<p>{k === 'kinship' ? 'Relations to the root' : capitalizeFirstLetter(k)}</p>
					</Col>
					{Array.isArray(data.get(k))
						? <Col key={'Col ' + k}>
							{data.get(k).filter((v) => v.path[0] === props.root).map((v, ix) => (
								<Row key={'Inner Row ' + v.kinship + ' ' + ix}>
									<Button
										className='text-start'
										variant="link"
										onClick={() => {
											highlight.length = 0;
											for (const name of v.path) {
												highlight.push(name);
											}
											close();
										}}>{v.kinship}
									</Button>
								</Row>
							))}
						</Col> :
						<Col key={data.get(k)}><p>{data.get(k)}</p></Col>
					}
				</Row>
			));
	}
}
