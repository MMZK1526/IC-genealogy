import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React, { useState } from "react";
import "./Sidebar.css"

export function Sidebar(props) {
  return (
    <div className='sidebar'>
      <div className='name-field'>
        <FilterForm title="Name :" placeholder="Name" type="text" onChange={props.nameChange}/>
      </div>
      <div className='date-from-field'>
        <FilterForm title="From :" placeholder="Year" type="number" onChange={props.yearFromChange}/>
      </div>
      <div className='date-to-field'>
        <FilterForm title="To :" placeholder="Year" type="number" onChange={props.handleChangeTo}/>
      </div>
      <Button className='apply-button' size='lg' type='primary' onClick={props.onClick}>
        Apply filters
      </Button>{' '}
    </div>
  );
  
}
