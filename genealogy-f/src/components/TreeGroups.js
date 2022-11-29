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
import EscapeCloseable from "./EscapeCloseable";

export class TreeGroups extends React.Component {
  constructor(props) {
    super(props);
    this.onClickNew = this.onClickNew.bind(this);
    this.groups = [];
    this.state = {
      groupId: 1,
    };

    this.groupModel = props.groupModel;
    this.personMap = props.personMap;
  }

  onClickNew = () => {
    this.groups.push({groupId: this.state.groupId, name: 'New Group ' + this.state.groupId, personIds: []});
    this.setState({groupId: this.state.groupId + 1});
    console.log("onClickNew");
    console.log(this.groups);
  }

  // render() {
  //   return (
  //     <div className='sidebar pe-auto'>
  //       {/* <label className="form-label">Select a group</label> */}

  //       <label className="form-label">Create custom group</label>
  //       <Button className='m-1 text-center w-100' variant="success" onClick={() => this.onClickNew()}>
  //         Create new group
  //       </Button>
  //       {/* <Button className='m-1 text-center w-100' variant="primary" onClick={() => {}}>
  //         Reset
  //       </Button> */}
  //     </div>
  //   );
  // }

  render() {
    const style = {
      searchBox: { // To change search box element look
        'fontSize': '20px',
        'border': '1px solid',
      },
    };
    
    let ids = [...this.personMap.keys()].filter(id => this.personMap.get(id).get("name") != undefined)

    let groupItemSet = this.groupModel.groupItemSet
    let globalSet = this.groupModel.globalSet

    // create set that we will then add to either global or group
    return (
      <EscapeCloseable>
        <div className='sidebar pe-auto'>
          <Container className='overflow-auto additional-properties-container'>
            <Form>
              <Form.Label className="form-label">People in group: </Form.Label>
              <Multiselect
                  id='pob-select'
                  options={ids.map((v) => ({
                    name: (this.personMap.get(v)).get("name"),
                    id: v
                  }))} // Options to display in the dropdown
                  selectedValues={[...this.groupModel.groupSet].map((v) => ({
                    name: (this.personMap.get(v)).get("name"),
                    id: v
                  }))} // Preselected value to persist in dropdown
                  onSelect={(_, v) => this.groupModel.groupSet.add(v.id)} // Function will trigger on select event
                  onRemove={(_, v) => this.groupModel.groupSet.delete(v.id)} // Function will trigger on remove event
                  displayValue='name' // Property name to display in the dropdown options
                  style={style}
              />
            </Form>
            {this.showPropertiesSwitch(groupItemSet)}

            <h5>Default</h5>
            {this.showPropertiesSwitch(globalSet)}
          </Container>
        </div>
      </EscapeCloseable>
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


