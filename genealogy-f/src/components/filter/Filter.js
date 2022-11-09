import {Form, Row} from "react-bootstrap"
import './Filter.css'

export function DropDown(props) {
  return (
    <Form>
    <Form.Label className="label">Family: </Form.Label>
    <select className="family-select" name="cars" onChange={props.onChange}>
      <option value=""></option>
      <option value="House of Windsor">House of Windsor</option>
      <option value="House of Li">House of Li</option>
      <option value="none">...</option>
      <option value="none">...</option>
    </select>
    </Form>
  );
}
