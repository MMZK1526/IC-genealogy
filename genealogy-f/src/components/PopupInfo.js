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

function PopupInfo(props) {
	const onNew = (_) => {
		props.onNew();
		props.closePopUp();
	};

	const onExtend = (_) => {
		props.onExtend();
		props.closePopUp();
	};

	const onToggle = (_) => {
		props.onToggle();
		props.closePopUp();
	}

	return (
		<div className='popup-inner'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getAdditionalProperties(props.info, props.switchToRelations, props.id)}
				<Container className='text-center mt-2'>
					<Button variant='primary' onClick={onExtend} className='m-1'>
						Extend tree from this person
					</Button>
					<Button variant='primary' onClick={onNew} className='m-1'>
						Use this person as root
					</Button>
					<Button variant='primary' onClick={onToggle} className='m-1'>
						{props.isHidden ? 'Show this person' : 'Not interested'}
					</Button>
				</Container>
			</EscapeCloseable>
		</div >
	);
}

function getAdditionalProperties(data, switchToRelations, id) {
	const openInWikipedia = url => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const openSearch = name => {
		window.open('http://www.google.com/search?q=' + name, '_blank', 'noopener,noreferrer');
	};

	return (
		<Container>
			<Row>
				<Col md='auto' className='mb-4'>
					<Image className='rounded' src={data.has('image') ? data.get('image') : DefaultImg} height='140px' />
				</Col>
				<Col className='mb-4'>
					<Row className='mb-1 justify-content-start'>
						<h2>{data.get('name')}</h2>
					</Row>
					<Row className='mb-1'>
						<p className='fst-italic'>
							{data.has('description') ? capitalizeFirstLetter(data.get('description')) : '(No description)'}
						</p>
					</Row>

					<ButtonGroup className='me-2' aria-label='LinksGroup'>
						{
							data.has('wikipedia link') &&
							<Button variant='light' className='wikilink' onClick={() => openInWikipedia(data.get('wikipedia link'))}>
								<FaWikipediaW size={30} />
							</Button>
						}

						<Button variant='light' className='search' onClick={() => openSearch(data.get('name'))}>
							<FcGoogle size={30} />
						</Button>
					</ButtonGroup>

					<Button variant='secondary' onClick={() => switchToRelations()}>
						<Image src={PersonWeb} height='30px' className="align-middle" />
						<span className="align-middle"> Relations</span>
					</Button>
				</Col>
			</Row>
			<Row>
				<Container className='overflow-auto additional-properties-container'>
					{getAllAttr(data, id)}
				</Container>
			</Row>
		</Container>
	);
}

function getAllAttr(data, id) {
	let group = new Set("Q11102170", "Q8255089")
	let attrSet = new Set(["name", "child"])
	console.log(data)
	data = new Map([...data].filter(([k,v]) => attrSet.has(k)))
	console.log(data)
	let x = Object.keys(Object.fromEntries(data)).filter(function (k) {
		return k
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
	console.log(x)
	return x.map((k) => (
		<Row key={'Row ' + k}>
			<Col xs={4} key={k}>
				<p>{capitalizeFirstLetter(k)}</p>
			</Col>
			<Col key={data.get(k)}>
				{
					Utils.locationKeywords.includes(k)
						? <a href={'http://www.google.com/maps?q=' + data.get(k)} target='_blank' rel='noopener noreferrer'>
							<TbMapSearch />
							{' ' + data.get(k)}
						</a>
						: <p>{true ? data.get(k) : "hello"}</p>
				}
			</Col>
		</Row>
	));
}

export default PopupInfo
