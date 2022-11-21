import { green } from '@mui/material/colors';
import React from 'react';
import Button from 'react-bootstrap/Button';
import './stylesheets/Sidebar.css';

export class TreeGroups extends React.Component {
  constructor(props) {
    super(props);
    this.onClickNew = this.onClickNew.bind(this);
    this.groups = [];
    this.state = {
      groupId: 1,
    };
    // TODO
  }

  onClickNew = () => {
    this.groups.push({groupId: this.state.groupId, name: 'New Group ' + this.state.groupId, personIds: []});
    this.setState({groupId: this.state.groupId + 1});
    console.log("onClickNew");
    console.log(this.groups);
  }

  render() {
    return (
      <div className='sidebar pe-auto'>
        {/* <label className="form-label">Select a group</label> */}

        <label className="form-label">Create custom group</label>
        <Button className='m-1 text-center w-100' variant="success" onClick={() => this.onClickNew()}>
          Create new group
        </Button>
        {/* <Button className='m-1 text-center w-100' variant="primary" onClick={() => {}}>
          Reset
        </Button> */}
      </div>
    );
  }
}
