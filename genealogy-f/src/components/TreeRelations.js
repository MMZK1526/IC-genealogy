import './stylesheets/PopupInfo.css';
import './stylesheets/shared.css';
import EscapeCloseable from './EscapeCloseable';
import CloseButton from 'react-bootstrap/CloseButton';
import Container from 'react-bootstrap/Container';

export function TreeRelations(props) {
	return (
		<div className='popup-inner'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getRelations() /* TODO: getRelations(props.info) */}
			</EscapeCloseable>
		</div >
	);
}

function getRelations(data) {
	return (
		<Container>
			TODO
		</Container>
	);
}