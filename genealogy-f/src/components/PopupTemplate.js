import './stylesheets/PopupInfo.css'
import './stylesheets/Sidebar.css';
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
import { useState } from "react";
import Form from 'react-bootstrap/Form';

function PopupTemplate(props) {
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
        // could also set this back to popup-inner
		<div className='sidebar pe-auto'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getAdditionalProperties(props.info, props.switchToRelations, props.id, props.mySet, props.personMap)}
			</EscapeCloseable>
		</div >
	);
}

function getAdditionalProperties(data, switchToRelations, id, mySet, personMap) {
	const openInWikipedia = url => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const openSearch = name => {
		window.open('http://www.google.com/search?q=' + name, '_blank', 'noopener,noreferrer');
	};

	return (
		<Container>
			<Row>
				<Container className='overflow-auto additional-properties-container'>
					{getAllAttr(data, id, mySet, personMap)}
				</Container>
			</Row>
		</Container>
	);
}
const iteratorIncludes = (it, value) => {
	for (let x of it) {
	  if (x === value) return true
	}
	return false
  }

function getAllAttr(data, id, mySet, personMap) {
    // console.log()
	// every Group must exist in groupAttr
	// keyGroup = new Map([["WD-Q11102170", "a"], ["WD-Q8255089", "a"], ["WD-Q11102170", "b"]])
	// groupAttr = new Map([["a", new Set(["name", "child"])], ["b", new Set(["name"])]])
	// console.log(iteratorIncludes(keyGroup.keys(), id))
	// data = iteratorIncludes(keyGroup.keys(), id)  ? new Map([...data].filter(([k,v]) => (groupAttr.get(keyGroup.get(id))).has(k))) : data
    // // pass in longest possible data list for data
	// let x = Object.keys(Object.fromEntries(data)).filter(function (k) {
	// 	return iteratorIncludes(keyGroup.keys(), id) ? k : !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k)
	// })

    // keyGroup = new Map([["WD-Q11102170", "a"], ["WD-Q8255089", "a"], ["WD-Q11102170", "b"]])
	// groupAttr = new Map([["a", new Set(["name", "child"])], ["b", new Set(["name"])]])
	// data = new Map([...data].filter(([k,v]) => mySet.has(k)))
    // pass in longest possible data list for data
    
    let displayOptions = [...personMap.values()].map((m) => [...m.keys()])
    let ranked = displayOptions.sort((a,b) => b.length - a.length)[0]
    ranked = ranked.filter(function (k) {
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
    ranked.forEach(item => mySet.add(item))
	return ranked.map((k) => (
		<Row key={'Row ' + k}>
			<Col xs={4} key={k}>
				<p>{capitalizeFirstLetter(k)}</p>
			</Col>
			<Col key="check_switch">
                <Form>
                    <Form.Check
                        reverse
                        type="switch"
                        id="custom-switch"
                        defaultChecked={mySet.has(k)}
                        onChange={(e) => {e.target.checked ? mySet.add(k) : mySet.delete(k)}}
                    />
                </Form>
			</Col>
		</Row>
	));
}

export default PopupTemplate
