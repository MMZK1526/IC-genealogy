import React from "react";
import {Form, Row} from "react-bootstrap"
import './Filter.css'

export function FilterForm(props) {
  return (
    <Form>
      <Form.Group>
        <Row>
          <Form.Label className="label">{props.title}</Form.Label>
        </Row>
        <Row>
          <Form.Control className="control" value={props.name} type={props.type} placeholder={props.placeholder} onChange={props.onChange}/>
        </Row>  
      </Form.Group>
    </Form>
  );
}

export function DropDown(props) {
  return (
    <Form>
    <Form.Label className="label">Family Name: </Form.Label>
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
