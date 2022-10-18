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
          <Form.Control className="control" type={props.type} placeholder={props.placeholder} onChange={props.onChange}/>
        </Row>  
      </Form.Group>
    </Form>
  );
}