import './stylesheets/PopupInfo.css'
import './stylesheets/shared.css';
import EscapeCloseable from './EscapeCloseable';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FaWikipediaW } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { ButtonGroup } from 'react-bootstrap';
import CloseButton from 'react-bootstrap/CloseButton';
import { TbMapSearch } from 'react-icons/tb'
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import Image from 'react-bootstrap/Image';
import DefaultImg from '../images/default.png';
import PersonWeb from '../images/person-web.png';
import { Utils } from './utils';
import { MdPadding } from 'react-icons/md';

function RelSearchResult(props) {

	return (
		<div className='popup-inner w-50'>
			<EscapeCloseable onClick={props.closeRelSearchResult}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getRelationsFrom(props.info)}
			</EscapeCloseable>
		</div >
	);
}

function getRelationsFrom(data) {

    if (data.get("kinship") === undefined) {
        return (
            <label>No valid relationship is found!</label>
        );
    }

    return (
        <label>{data.get("kinship")[0].kinship}</label>
    );
}

export default RelSearchResult