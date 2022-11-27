import './stylesheets/PopupInfo.css';
import './stylesheets/shared.css';
import EscapeCloseable from './EscapeCloseable';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import { Utils } from './utils';

export function TreeRelations(props) {
	return (
		<div className='popup-inner'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{ShowRelations(props.info, props.highlight, props.closePopUp)}
			</EscapeCloseable>
		</div >
	);
}

function ShowRelations(data, highlight, close) {
	return (
		<Container>
			{getRelationFields(data, highlight, close)}
		</Container>
	);
}

function getRelationFields(data, highlight, close) {
	return Object.keys(Object.fromEntries(data)).filter(function (k) {
		return Utils.relationsKeywords.includes(k);
	}).map((k) => (
		<Row key={'Row ' + k}>
			<Col xs={4} key={k}>
				<p>{capitalizeFirstLetter(k)}</p>
			</Col>
			{Array.isArray(data.get(k))
				? <Col key={'Col ' + k}>
					{data.get(k).map((v, ix) => (
						<Row key={'Inner Row ' + v.kinship + ' ' + ix}>
							<Button
								className='text-start'
								variant="link"
								onClick={() => {
									highlight.length = 0;
									for (const name of v.path) {
										highlight.push(name);
									}
									console.log(highlight);
									close();
								}}>{v.kinship}
							</Button>
						</Row>
					))}
				</Col> :
				<Col key={data.get(k)}>
					<p>
						{data.get(k)}
					</p>
				</Col>
			}
		</Row>
	));
}
