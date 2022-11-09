import React from "react";
import {Button, Form} from "react-bootstrap"
import {MdOutlinePersonSearch} from "react-icons/md"
import ClipLoader from 'react-spinners/ClipLoader';
import { Navigate } from "react-router-dom";
import './NameSearch.css'

export class NameSearch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      initialName: '',
      result: null,
      isLoading: false
    };
    this.requests = this.props.requests;

    this.handleChangeInitialName = this.handleChangeInitialName.bind(this);
    this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
  }

  handleChangeInitialName(event) {
    this.setState({initialName: event.target.value});
  }

  async handleSearchSubmit(event) {
    event.preventDefault();

    if (this.state.initialName === '') {
      alert("Please enter a name!");
      return;
    }

    this.setState({
        isLoading: true,
    });

    await this.requests.search(this.state.initialName).then(r => {
      if (Object.values(r).length === 0) {
        alert("Person not found!");
        return;
      }

      this.setState({result: r});
    });
  }

  render() {
    if (this.state.result) {
      return (<Navigate to="/result" replace={true} state={{result: this.state.result}}/>);
    }
    return (
      <div>
        <form className='welcome' onSubmit={this.handleChangeInitialName}>
            <div id='title'>Ancesta - Genealogy Project</div>
            <br></br>
            <div id='search'>
                <MdOutlinePersonSearch size={50} color='darkslategray'/> 
                <Form.Control
                    id='search-bar'
                    type="text"
                    placeholder="Search a name to start..."
                    onChange={this.handleChangeInitialName}
                />
                {!this.state.isLoading
                    ? <Button
                    className='search-button'
                    type='primary'
                    onClick={this.handleSearchSubmit}>
                    Search</Button>
                    : <div><ClipLoader
                          className={
                            'spinner'
                          }
                          color='#0000ff'
                          cssOverride={{
                              display: 'block',
                              margin: '0 auto',
                          }}
                          size={75}
                      /></div>
                }
            </div>
        </form>
      </div>
    );
  }
}
