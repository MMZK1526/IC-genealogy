import "./stylesheets/PopupInfo.css"
import './stylesheets/shared.css';
import EscapeCloseable from "./EscapeCloseable";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {FaWikipediaW} from 'react-icons/fa'
import {FcGoogle} from 'react-icons/fc'
import { ButtonGroup } from 'react-bootstrap';
import CloseButton from 'react-bootstrap/CloseButton';
import {TbMapSearch} from 'react-icons/tb'
import {capitalizeFirstLetter} from "../GenogramTree/utilFunctions";
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

	return (
		<div className='popup-inner'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp}/>
				{getAdditionalProperties(props.info)}
				<Container className="text-center">
					<Button variant="primary" onClick={onExtend} className="m-1">
						Extend tree from this person
					</Button>
					<Button variant="primary" onClick={onNew}>
						Use this person as root
					</Button>
				</Container>
			</EscapeCloseable>
		</div>
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
				<Col md="auto">
          <Image src={DefaultImg} height='100px'/>
        </Col>
				<Col>
					<Row className='mb-1 justify-content-start'>
						<Col key={"Name"} md="auto">
							<h2>{data.get("Name")}</h2>
						</Col>

						<Col key={"Links"} md="auto">
							<ButtonGroup aria-label="LinksGroup">
								<Button variant="light" className="search" onClick={() => openSearch(data.get("Name"))}>
									<FcGoogle size={30}/>
								</Button>

								{
									data.has("Wikipedia link") &&
									<Button variant="light" className="wikilink" onClick={() => openInWikipedia(data.get("Wikipedia link"))}>
										<FaWikipediaW size={30}/>
									</Button>
								}
							</ButtonGroup>
						</Col>
					</Row>
					<Row>
						<Col key="Description">
							{data.has("Description") &&
								<p className="fst-italic">
									{capitalizeFirstLetter(data.get("Description"))}
								</p>}
						</Col>
					</Row>
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
		return k !== "Name" && k !== "Description" && k !== "Wikipedia link";
	  }).map((k) => (
		<Row key={"Row "+k}>
			<Col xs={4} key={k}>
				<p>{k}</p>
			</Col>
			<Col key={data.get(k)}>
				{
					k === "Place of birth" || k === "Place of death"
					? <a href={"http://www.google.com/maps?q="+data.get(k)} target="_blank" rel="noopener noreferrer">
						<TbMapSearch/>
						{" " + data.get(k)}
					</a>
					: <p>{data.get(k)}</p>
				}
			</Col>
		</Row>
	));
}

export default PopupInfo