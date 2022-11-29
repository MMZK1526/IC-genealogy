import './stylesheets/PopupInfo.css';
import './stylesheets/shared.css';
import EscapeCloseableEnterClickable from './EscapeCloseableEnterClickable';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import { Utils } from './utils';
import { useState } from 'react';

export function TreeRelations(props) {
return (
		<div className='popup-inner w-50 overflow-auto' style={{ maxHeight: "50%" }}>
			<EscapeCloseableEnterClickable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getRelationFields(props.info, props.highlight, props.closePopUp)}
			</EscapeCloseableEnterClickable>
		</div >
	);

	function getRelationFields(data, highlight, close) {
		return Object.keys(Object.fromEntries(data)).filter(function (k) {
			return Utils.relationsKeywords.includes(k);
		}).map((k) => (
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
					<Col key={data.get(k)}>
						<p>
							{data.get(k)}
						</p>
					</Col>
				}
			</Row>
		));
	}
}
