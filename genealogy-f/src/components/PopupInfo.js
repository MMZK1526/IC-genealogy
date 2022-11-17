import "./stylesheets/PopupInfo.css"
import './stylesheets/shared.css';
import EscapeCloseable from "./EscapeCloseable";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FaWikipediaW } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { ButtonGroup } from 'react-bootstrap';
import CloseButton from 'react-bootstrap/CloseButton';
import { TbMapSearch } from 'react-icons/tb'
import { capitalizeFirstLetter } from "../GenogramTree/utilFunctions";
import DefaultImg from "../images/default.png";
import Image from "react-bootstrap/Image";

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
				{getAdditionalProperties(props.info)}
				<Container className="text-center mt-2">
					<Button variant="primary" onClick={onExtend} className="m-1">
						Extend tree from this person
					</Button>
					<Button variant="primary" onClick={onNew} className="m-1">
						Use this person as root
					</Button>
					<Button variant="primary" onClick={onToggle} className="m-1">
						{props.isHidden ? "Show this person" : "Hide this person"}
					</Button>
				</Container>
			</EscapeCloseable>
		</div >
	);
}

function getAdditionalProperties(data) {
	const openInWikipedia = url => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const openSearch = name => {
		window.open("http://www.google.com/search?q=" + name, '_blank', 'noopener,noreferrer');
	};

	return (
		<Container>
			<Row>
				<Col md="auto" className='mb-4'>
					<Image className="rounded" src={data.has("image") ? data.get("image") : DefaultImg} height='140px' />
				</Col>
				<Col className='mb-4'>
					<Row className='mb-1 justify-content-start'>
						<h2>{data.get("name")}</h2>
					</Row>
					<Row className="mb-1">
						<p className="fst-italic">
							{data.has("description") ? capitalizeFirstLetter(data.get("description")) : '(No description)'}
						</p>
					</Row>
					<ButtonGroup aria-label="LinksGroup">
						{
							data.has("wikipedia link") &&
							<Button variant="light" className="wikilink" onClick={() => openInWikipedia(data.get("wikipedia link"))}>
								<FaWikipediaW size={30} />
							</Button>
						}

						<Button variant="light" className="search" onClick={() => openSearch(data.get("name"))}>
							<FcGoogle size={30} />
						</Button>
					</ButtonGroup>
				</Col>
			</Row>
			<Row>
				<Container className="overflow-auto additional-properties-container">
					{getAllAttr(data)}
				</Container>
			</Row>
		</Container>
	);
}

function getAllAttr(data) {
	return Object.keys(Object.fromEntries(data)).filter(function (k) {
		return k !== "name" && k !== "description" && k !== "wikipedia link" && k !== "image";
	}).map((k) => (
		<Row key={"Row " + k}>
			<Col xs={4} key={k}>
				<p>{capitalizeFirstLetter(k)}</p>
			</Col>
			<Col key={data.get(k)}>
				{
					k === "place of birth" || k === "place of death"
						? <a href={"http://www.google.com/maps?q=" + data.get(k)} target="_blank" rel="noopener noreferrer">
							<TbMapSearch />
							{" " + data.get(k)}
						</a>
						: <p>{data.get(k)}</p>
				}
			</Col>
		</Row>
	));
}

export default PopupInfo