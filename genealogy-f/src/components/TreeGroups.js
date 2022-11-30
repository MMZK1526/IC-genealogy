import React from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { capitalizeFirstLetter } from '../GenogramTree/utilFunctions';
import { Utils } from './utils';
import Form from 'react-bootstrap/Form';
import Multiselect from 'multiselect-react-dropdown';

import './stylesheets/PopupInfo.css'
import './stylesheets/Sidebar.css';
import './stylesheets/shared.css';
import EscapeCloseableEnterClickable from "./EscapeCloseableEnterClickable";

export class TreeGroups extends React.Component {
  constructor(props) {
    super(props);

    this.groupModel = props.groupModel; // TODO: move this to state
    this.personMap = props.personMap;

    this.state = {
      currGroupMembers: [...this.groupModel.getCurrGroupMembers()],
      groups: this.groupModel.getAllGroups(),
    };

    this.changeGroupSelection = this.changeGroupSelection.bind(this);
    this.addNewGroup = this.addNewGroup.bind(this);
  }

  changeGroupSelection (event) {
    this.groupModel.setCurrentGroupId(event.target.value);
    this.setState({ currGroupMembers: [...this.groupModel.getCurrGroupMembers()] });
  }

  addNewGroup () {
    this.groupModel.addNewGroup();
    this.setState({ groups: this.groupModel.getAllGroups() });
  }

  render() {
    const style = {
      searchBox: { // To change search box element look
        'fontSize': '20px',
        'border': '1px solid',
      },
    };
    
    let ids = [...this.personMap.keys()].filter(id => this.personMap.get(id).get("name") != undefined);
    // let groups = this.groupModel.getAllGroups();

    // create set that we will then add to either global or group
    return (
      <EscapeCloseableEnterClickable>
        <div className='sidebar pe-auto'>
          <Container className='overflow-auto additional-properties-container'>
            <h5 className='mb-3'>All groups</h5>

            <Form className='mb-2'>
              <Form.Select
                className='mb-2'
                // onChange={(event) => this.groupModel.setCurrentGroupId(event.target.value)}
                onChange={this.changeGroupSelection}
              >
                  { this.state.groups.map((group) => {
                    // <option>lolz</option>
                    return (<option value={group.id}>{group.name}</option>);
                  }) }
              </Form.Select>

              <Form.Label className="form-label">People in group: </Form.Label>
              <Multiselect
                id='pob-select'
                options={ids.map((v) => ({
                  name: (this.personMap.get(v)).get("name"),
                  id: v
                }))} // Options to display in the dropdown
                selectedValues={this.state.currGroupMembers.map((v) => ({
                  name: (this.personMap.get(v)).get("name"),
                  id: v
                }))} // Preselected value to persist in dropdown
                onSelect={(_, v) => this.groupModel.addPersonToGroup(v.id)} // Function will trigger on select event
                onRemove={(_, v) => this.groupModel.removePersonFromGroup(v.id)} // Function will trigger on remove event
                displayValue='name' // Property name to display in the dropdown options
                style={style}
              />
            </Form>

            {/* <label className="form-label">Create custom group</label> */}
            <Button className='mb-3 text-center w-100' variant="success" onClick={this.addNewGroup}>
              Create new group
            </Button>

            {this.showPropertiesSwitch(this.groupModel.getCurrGroupProperties())}

            <h5 className='mt-3 mb-3'>Default</h5>
            {this.showPropertiesSwitch(this.groupModel.getDefaultProperties())}
          </Container>
        </div>
      </EscapeCloseableEnterClickable>
    );
  }

  showPropertiesSwitch (set) {
    // Display options
    let displayOptions = [...this.personMap.values()].map((m) => [...m.keys()]);
    let ranked = displayOptions
      .sort((a,b) => b.length - a.length)[0]
      .filter(function (k) {
        return !Utils.specialKeywords.includes(k) && !Utils.relationsKeywords.includes(k);
      });
    
    return (
      <div>
      { ranked.map((k) => (
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
                  defaultChecked={ set.has(k) }
                  onChange={(e) => { e.target.checked ? set.add(k) : set.delete(k)}}
              />
            </Form>
          </Col>
        </Row>
      )) }
      </div>
    );
  }
}


