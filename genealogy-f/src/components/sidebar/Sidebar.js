
import {Form, Row} from "react-bootstrap"
import "./Sidebar.css"

export function Sidebar(props) {
  return (
    <div className='sidebar'>
      <Form>
        <Form.Group className="form-group" controlId="family-name-filter">
          <Form.Label>Family Name</Form.Label>
          <Form.Control placeholder="e.g. Windsor" type="text" onChange={props.familyChange}/>
        </Form.Group>
        <Form.Group className="form-group" controlId="bloodline-checkbox">
          <Form.Check title="Bloodline" label="Bloodline Only" type="checkbox" defaultChecked 
          onChange={props.onBloodlineChange}
          />
        </Form.Group>
      </Form>
    </div>
  );
}
