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

function PopupTemplate(props) {
	return (
        // could also set this back to popup-inner
		<div className='sidebar pe-auto'>
			<EscapeCloseable onClick={props.closePopUp}>
				<CloseButton className='close-btn' onClick={props.closePopUp} />
				{getAdditionalProperties(props.info, props.switchToRelations, props.id, props.groupModel, props.personMap)}
			</EscapeCloseable>
		</div >
	);
}

function getAdditionalProperties(data, switchToRelations, id, groupModel, personMap) {
	return (
		<Container>
			<Row>
				<Container className='overflow-auto additional-properties-container'>
					{getAllAttr(data, id, groupModel, personMap)}
				</Container>
			</Row>
		</Container>
	);
}

function getAllAttr(data, id, groupModel, personMap) {

    const onApplyAll = (selectSet) => {
        groupModel.globalSet = selectSet
    }
    
    const onApplyGroup = (selectSet) => {
        groupModel.groupItemSet = selectSet

    }
    
    let displayOptions = [...personMap.values()].map((m) => [...m.keys()])
    let ranked = displayOptions.sort((a,b) => b.length - a.length)[0]
    ranked = ranked.filter(function (k) {
		return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
	})
    let selectSet = groupModel.selectSet
    // create set that we will then add to either global or group
    ranked.forEach(item => selectSet.add(item))
	return (<>
        {ranked.map((k) => (
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
                            defaultChecked={selectSet.has(k)}
                            onChange={(e) => {e.target.checked ? selectSet.add(k) : selectSet.delete(k)}}
                        />
                    </Form>
                </Col>
            </Row>
        ))}
        <Button className='m-1 text-center w-100' variant="primary" onClick={() => onApplyAll(selectSet)}>
            Apply to all
        </Button>
        <Button className='m-1 text-center w-100' variant="primary" onClick={() => onApplyGroup(selectSet)}>
			Apply to group
		</Button>
    </>
    )
}


export default PopupTemplate
