import './stylesheets/PopupInfo.css'
import './stylesheets/shared.css';
import EscapeCloseableEnterClickable from './EscapeCloseableEnterClickable';
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
import React from "react";

class PopupInfo extends React.Component {
	constructor(props) {
		super(props);
		this.groupModel = props.groupModel;
		this.id = props.id;
		this.state = {
			hasPerson: this.groupModel.checkPersonInCurrGroup(this.id),
			inGroups: this.groupModel.getGroupsForPerson(this.id)
		};
	}

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

	onGroupButtonClick = (_) => {	/* NOTE: temporarily unused, due to complexity of multi-group */
		if (this.groupModel.checkPersonInCurrGroup(this.props.id)) {
			this.groupModel.removePersonFromGroup(this.props.id);
		} else {
			this.groupModel.addPersonToGroup(this.props.id);
		}

		this.setState({ hasPerson: this.groupModel.checkPersonInCurrGroup(this.id) });
		this.props.closePopUp();
	}

	printGroupNames() {
		let result = "";
		for (let index in this.state.inGroups) {
			if (index != 0 && index < this.state.inGroups.length) {
				result = result + ", ";
			}
			result = result + this.state.inGroups[index].name;

		}
		return result;
	}

	render() {
		return (
			<div className='popup-inner w-50'>
				<EscapeCloseableEnterClickable onClick={this.props.closePopUp} onEnterClick={
					() => {
						this.props.onExtend();
						this.props.closePopUp();
					}
				}>
					<CloseButton className='close-btn' onClick={this.props.closePopUp} />
					{getAdditionalProperties(this.props.info, this.props.switchToRelations, this.props.id, this.groupModel, this.props.inGroup)}
					<Container className='text-center mt-2'>
						<Row className='mb-3'>
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
						<Row className='mb-3'>
							<Col xs="auto">
								In groups:
							</Col>
							<Col xs="auto">
								{this.printGroupNames()}
							</Col>
						</Row>
						<Row>
							<Col xs="auto">
								<Button variant={this.props.extendImpossible ? 'warning' : 'primary'} onClick={this.onExtend} className='m-1'>
									Extend tree from this person
								</Button>
							</Col>
							<Col xs="auto">
								<Button variant='primary' onClick={this.onNew} className='m-1'>
									Use this person as root
								</Button>
							</Col>
							<Col xs="auto">
								<Button variant='primary' onClick={this.onGroupButtonClick} className='m-1'>
									{this.state.hasPerson ? 'Remove from group' : 'Add to group' /* NOTE: temporarily disabled */}
								</Button>
							</Col>
						</Row>
					</Container>
				</EscapeCloseableEnterClickable>
			</div>
		);
	}
}

function getAdditionalProperties(data, switchToRelations, id, groupModel) {
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
					{getAllAttr(data, id, groupModel)}
				</Container>
			</Row>
		</Container>
	);
}


function getAllAttr(data, id, groupModel) {

	// pass in longest possible data list for data
	let x = Object.keys(Object.fromEntries(data)).filter(function (k) {
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
	// apply filters for both sets
	// x = x.filter((i) => groupModel.globalSet.has(i)).filter((i) => !inGroup || inGroup && groupModel.groupItemSet.has(i))
	x = x.filter((i) => groupModel.checkPropertyShownForPerson(id, i));
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
