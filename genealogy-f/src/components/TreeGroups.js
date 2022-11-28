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

export class TreeGroups extends React.Component {
  constructor(props) {
    super(props);
    this.onClickNew = this.onClickNew.bind(this);
    this.groups = [];
    this.state = {
      groupId: 1,
    };
    // TODO

    this.info = props.info;
    this.id = props.id;
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
      return (
        <div className='sidebar pe-auto'>
          <Container className='overflow-auto additional-properties-container'>
            {/* {getAllAttr(props.info, props.switchToRelations, props.id, props.groupModel, props.personMap)} */}
            {this.getAllAttr(this.info, this.id, this.groupModel, this.personMap)}
          </Container>
        </div >
      );
    }
  
    getAllAttr(data, id, groupModel, personMap) {
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
      return (
        <>
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
                      defaultChecked={globalSet.has(k)}
                      onChange={(e) => { e.target.checked ? globalSet.add(k) : globalSet.delete(k)}}
                  />
                </Form>
              </Col>
            </Row>
          )) }
        </>
      )
  }
}


