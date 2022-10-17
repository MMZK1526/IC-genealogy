import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import {FilterForm} from '../filter/Filter.js'
import "./Sidebar.css"

export function FiltersSidebar() {
  // const { collapseSidebar } = useProSidebar();

  return (
    <Sidebar className='FilterSidebar'>
      <Menu>
        <MenuItem>
          <FilterForm title="Name :" placeholder="Name" type="text"/>
        </MenuItem>
        <MenuItem>
          <FilterForm title="From :" placeholder="Year" type="text"/>
        </MenuItem>
        <MenuItem>
          <FilterForm title="To :" placeholder="Year" type="text"/>
        </MenuItem>
      </Menu>
    </Sidebar>
      
    // <main>
    //   <button onClick={() => collapseSidebar()}>Collapse</button>
    // </main>
  );
}

