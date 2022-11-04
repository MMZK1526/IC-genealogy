import Button from 'react-bootstrap/Button';
import {FilterForm, DropDown} from '../filter/Filter.js'
import React from "react";
import "./Sidebar.css"

export function Sidebar(props) {
  return (
    <div className='sidebar'>
      <div className='date-from-field'>
        <FilterForm title="Year from:" placeholder="year of birth" type="text" onChange={props.yearFromChange}/>
      </div>
      <div className='date-to-field'>
        <FilterForm title="Year to:" placeholder="year of birth" type="text" onChange={props.yearToChange}/>
      </div>
      {/* <div className='family-field'> */}
        {/* <FilterForm title="Family Name" placeholder="e.g. Windsor" type="text" onChange={props.familyChange}/> */}
      {/* </div> */}
      <div className = 'family-field'><DropDown onChange={props.familyChange}/> </div>
      <Button className='apply-button' size='lg' type='primary' onClick={props.onClick} disabled={true}>
        Apply filters
      </Button>
    </div>
  );
}
