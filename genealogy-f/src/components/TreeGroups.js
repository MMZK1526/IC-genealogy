import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import { Utils } from './Utils';
import Form from 'react-bootstrap/Form';
import Multiselect from 'multiselect-react-dropdown';

import './stylesheets/PopupInfo.css'
import './stylesheets/Sidebar.css';
import './stylesheets/shared.css';
import EscapeCloseableEnterClickable from "./EscapeCloseableEnterClickable";

export function TreeGroups(props) {
  // constructor(props) {
  //   super(props);

  //   this.groupModel = props.groupModel;
  //   this.personMap = props.personMap;

  //   this.state = {
  //     currId: this.groupModel.getCurrentGroupId(),
  //     currGroupMembers: [...this.groupModel.getCurrGroupMembers()],
  //     currGroupProperties: this.groupModel.getCurrGroupProperties(),
  //     groups: this.groupModel.getAllGroups(),
  //   };

  //   // this.changeGroupSelection = this.changeGroupSelection.bind(this);
  //   this.changeGroupSelection = props.changeGroupSelection;
  //   this.addNewGroup = this.addNewGroup.bind(this);
  //   this.showPropertiesSwitch = this.showPropertiesSwitch.bind(this);
  // }

  // changeGroupSelection(groupId) {
  //   this.groupModel.setCurrentGroupId(groupId);
  //   this.setState({
  //     currId: groupId,
  //     currGroupProperties: this.groupModel.getCurrGroupProperties(),
  //     currGroupMembers: [...this.groupModel.getCurrGroupMembers()],
  //   }, function () {console.log(this.state.currGroupProperties)});
  //   // console.log(this.groupModel.getCurrGroupProperties())
  //   // console.log(this.state.currGroupProperties)
  //   // this.render();
  // }

  // addNewGroup () {
  //   this.groupModel.addNewGroup();
  //   this.setState({ groups: this.groupModel.getAllGroups() });
  // }
  const [name, setName] = useState("");

  const handleNameChange = (event) => {
    event.preventDefault();
    props.renameGroup(name);
  }

  const style = {
    searchBox: { // To change search box element look
      'fontSize': '20px',
      'border': '1px solid',
    },
  };

  let ids = [...props.personMap.keys()].filter(id => props.personMap.get(id).get("name") != undefined);

  return (
    // let groups = this.groupModel.getAllGroups();

    // create set that we will then add to either global or group
    <EscapeCloseableEnterClickable>
      <div className='sidebar pe-auto'>
        <Container className='overflow-auto additional-properties-container'>
          <Form className='mb-2'>
            <h5 className='mb-3'>All groups</h5>
            <Form.Select
              className='mb-2'
              value={props.groupModel.getCurrentGroupId()}
              // onChange={(event) => props.groupModel.setCurrentGroupId(event.target.value)}
              onChange={(event) => props.changeGroupSelection(event.target.value)}
            >
              {props.groupModel.getAllGroups().map((group, id) => {
                return (<option key={id} value={id}>{group.name}</option>);
              })}
            </Form.Select>

            <Row>
              <Form.Control
                className='w-50'
                type="text"
                placeholder="rename group to"
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                className='text-center w-50'
                variant="success"
                onClick={handleNameChange}
              >
                Rename
              </Button>
            </Row>

            <Form.Label className="form-label w-100">People in group: </Form.Label>
            <Multiselect
              id='pob-select'
              options={ids.map((v) => ({
                name: (props.personMap.get(v)).get("name"),
                id: v
              }))} // Options to display in the dropdown
              selectedValues={[...props.groupModel.getCurrGroupMembers()].map((v) => ({
                name: (props.personMap.get(v)).get("name"),
                id: v
              }))} // Preselected value to persist in dropdown
              onSelect={(_, v) => props.groupModel.addPersonToGroup(v.id)} // Function will trigger on select event
              onRemove={(_, v) => props.groupModel.removePersonFromGroup(v.id)} // Function will trigger on remove event
              displayValue='name' // Property name to display in the dropdown options
              style={style}
            />
          </Form>

          {/* <label className="form-label">Create custom group</label> */}
          <Button className='mb-3 text-center w-100' variant="success" onClick={props.addNewGroup}>
            Create new group
          </Button>

          {/* {showPropertiesSwitch(props.groupModel, props.personMap, false)} */}
          {showPropertiesSwitch(props.groupModel.getCurrGroupProperties(), props.personMap, props.externUpdate)}

          <h5 className='mt-3 mb-3'>Default</h5>
          {/* {showPropertiesSwitch(props.groupModel, props.personMap, true)} */}
          {showPropertiesSwitch(props.groupModel.getDefaultProperties(), props.personMap, props.externUpdate)}
        </Container>
      </div>
    </EscapeCloseableEnterClickable>
  );
}

function showPropertiesSwitch(set, personMap, externUpdate) {
  // Display options
  let displayOptions = [...personMap.values()].map((m) => [...m.keys()]);
  let ranked = displayOptions
    .sort((a, b) => b.length - a.length)[0]
    .filter(function (k) {
      return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
    })
    .map((property) => { return { label: property, checked: set.has(property) } });

  // console.log(ranked)

  const update = (ix, checked) => {
    if (checked) {
      set.add(ranked[ix].label);
      ranked[ix].label = false;
    } else {
      set.delete(ranked[ix].label);
      ranked[ix].label = true;
    }
    externUpdate();
  }

  return (
    <div>
      {ranked.map((property, ix) => (
        <Row key={'Row ' + property.label}>
          <Col key={property.label}>
            <p>{capitalizeFirstLetter(property.label)}</p>
          </Col>
          <Col xs={3} key="check_switch">
            <Form>
              <Form.Check
                reverse
                type="switch"
                id="custom-switch"
                checked={property.checked}
                // onChange={(e) => { e.target.checked ? set.add(property.label) : set.delete(property.label)}}
                onChange={(e) => update(ix, e.target.checked)}
              />
            </Form>
          </Col>
        </Row>
      ))}
    </div>
  );
}

