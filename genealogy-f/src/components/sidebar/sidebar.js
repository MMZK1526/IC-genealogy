import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import "./Sidebar.css"

export function FiltersSidebar() {
  return (
    <div className='sidebar'>
      <div className='name-field'>
        <FilterForm title="Name :" placeholder="Name" type="text"/>
      </div>
      <div className='date-from-field'>
        <FilterForm title="From :" placeholder="Year" type="number"/>
      </div>
      <div className='date-to-field'>
        <FilterForm title="To :" placeholder="Year" type="number"/>
      </div>
      <Button className='apply-button' size='lg' type='primary'>
        Apply filters
      </Button>{' '}
    </div>
  );
}

