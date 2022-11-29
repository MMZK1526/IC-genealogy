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
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import {Component} from "react";

class PopupInfo extends Component<{}> {
	onNew = (_) => {
		this.props.onNew();
		this.props.closePopUp();
	};

	onExtend = (_) => {
		this.props.onExtend();
		this.props.closePopUp();
	};

	onFilterModeChanged = (_) => {
		this.props.onFilterModeChanged();
	}

	onGroupAdd = (_) => {
		this.props.onGroupAdd();
		this.props.closePopUp();
	}

	componentDidMount() {
		document.getElementById("popupInfoFocus").focus();
	}

	render() {
		return (
			<div className='popup-inner w-50' tabIndex={0} id='popupInfoFocus'>
				<EscapeCloseable onClick={this.props.closePopUp}>
					<CloseButton className='close-btn' onClick={this.props.closePopUp}/>
					{getAdditionalProperties(this.props.info, this.props.switchToRelations, this.props.id, this.props.groupModel, this.props.inGroup)}
					<Container className='text-center mt-2'>
						<Row>
							<Col xs="auto">
								Filter Mode:
							</Col>
							<Col>
								<ToggleButtonGroup type="radio" name="filter-options"
												   defaultValue={this.props.isHidden ? 1 : 0} onChange={(e) => {
									this.onFilterModeChanged(e);
								}}>
									<ToggleButton
										id="filter-always-included"
										value={2}
										variant="outline-primary"
									>
										Always Included
									</ToggleButton>
									<ToggleButton
										id="filter-default"
										value={0}
										variant="outline-primary"
									>
										Default
									</ToggleButton>
									<ToggleButton
										id="filter-not-interested"
										value={1}
										variant="outline-primary"
									>
										Not Interested
									</ToggleButton>
								</ToggleButtonGroup>
							</Col>
						</Row>
						<Row>
							<Col xs="auto">
								<Button variant='primary' onClick={this.onExtend} className='m-1'>
									Extend tree from this person
								</Button>
							</Col>
							<Col xs="auto">
								<Button variant='primary' onClick={this.onNew} className='m-1'>
									Use this person as root
								</Button>
							</Col>
							<Col xs="auto">
								<Button variant='primary' onClick={this.onGroupAdd} className='m-1'>
									{this.props.inGroup ? 'Remove from group' : 'Add to group'}
								</Button>
							</Col>
						</Row>
					</Container>
				</EscapeCloseable>
			</div>
		);
	}
}

function getAdditionalProperties(data, switchToRelations, id, groupModel, inGroup) {
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
					{getAllAttr(data, id, groupModel, inGroup)}
				</Container>
			</Row>
		</Container>
	);
}


function getAllAttr(data, id, groupModel, inGroup) {

    // pass in longest possible data list for data
	let x = Object.keys(Object.fromEntries(data)).filter(function (k) {
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
	// apply filters for both sets
	x = x.filter((i) => groupModel.globalSet.has(i)).filter((i) => !inGroup || inGroup && groupModel.groupItemSet.has(i))
	// console.log(groupModel.globalSet)
	// console.log(groupModel.groupItemSet)
	// console.log(groupModel.groupSet)
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
						: <p>{data.get(k)}</p>
				}
			</Col>
		</Row>
	));
}

export default PopupInfo
