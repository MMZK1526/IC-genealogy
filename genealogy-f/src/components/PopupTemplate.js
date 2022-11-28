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
import './stylesheets/Sidebar.css';
import Multiselect from 'multiselect-react-dropdown';

function PopupTemplate(props) {
	return (
        // could also set this back to popup-inner
		<div className='sidebar pe-auto'>
            {/* <CloseButton className='close-btn' onClick={props.closePopUp} /> */}
            {getAdditionalProperties(props.info, props.switchToRelations, props.id, props.groupModel, props.personMap)}
		</div >
	);
}

function getAdditionalProperties(data, switchToRelations, id, groupModel, personMap) {
	return (
        <Container className='overflow-auto additional-properties-container'>
            {getAllAttr(data, id, groupModel, personMap)}
        </Container>
	);
}

function getAllAttr(data, id, groupModel, personMap) {

    const style = {
		searchBox: { // To change search box element look
			'fontSize': '20px',
			'border': '1px solid',
		},
	};
    
    let displayOptions = [...personMap.values()].map((m) => [...m.keys()])
    let ids = [...personMap.keys()].filter(id => personMap.get(id).get("name") != undefined)
    let ranked = displayOptions.sort((a,b) => b.length - a.length)[0]
    ranked = ranked.filter(function (k) {
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
    let groupItemSet = groupModel.groupItemSet
    let globalSet = groupModel.globalSet
    // create set that we will then add to either global or group
	return (<>
            <Form>
    		<Form.Label className="form-label">People in group: </Form.Label>
				<Multiselect
					id='pob-select'
					options={ids.map((v) => ({name: (personMap.get(v)).get("name"), id: v}))} // Options to display in the dropdown
					selectedValues={[...groupModel.groupSet].map((v) => ({name: (personMap.get(v)).get("name"), id: v}))} // Preselected value to persist in dropdown
					onSelect={(_, v) => groupModel.groupSet.add(v.id)} // Function will trigger on select event
					onRemove={(_, v) => groupModel.groupSet.delete(v.id)} // Function will trigger on remove event
					displayValue='name' // Property name to display in the dropdown options
					style={style}
				/>
                </Form>
        {ranked.map((k) => (
            <Row key={'Row ' + k}>
                <Col key={k}>
                    <p>{capitalizeFirstLetter(k)}</p>
                </Col>
                <Col xs={3} key="check_switch">
                    <Form>
                        <Form.Check
                            reverse
                            type="switch"
                            id="custom-switch"
                            defaultChecked={groupItemSet.has(k)}
                            onChange={(e) => { e.target.checked ? groupItemSet.add(k) : groupItemSet.delete(k)}}
                        />
                    </Form>
                </Col>
            </Row>
        ))}
        <h3>All other people</h3>
        {ranked.map((k) => (
            <Row key={'Row ' + k}>
                <Col key={k}>
                    <p>{capitalizeFirstLetter(k)}</p>
                </Col>
                <Col xs={3} key="check_switch">
                    <Form>
                        <Form.Check
                            reverse
                            type="switch"
                            id="custom-switch"
                            defaultChecked={globalSet.has(k)}
                            onChange={(e) => { e.target.checked ? globalSet.add(k) : globalSet.delete(k)}}
                        />
                    </Form>
                </Col>
            </Row>
        ))}
    </>
    )
}


export default PopupTemplate
