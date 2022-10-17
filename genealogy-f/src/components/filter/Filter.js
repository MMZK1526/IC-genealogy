import React from "react";
import {Form , Col , Row} from "react-bootstrap"

export function FilterForm(props) {
  return (
    <div>
      <Form>
        {" "}
        <Form.Group as={Row}>
          <Form.Label column sm="4">
            <span style={{ fontWeight: "400", fontSize: "20px", padding: "10px" }}>
              {props.title}
            </span>
          </Form.Label>
          <Col sm="7" style={{ marginTop: "5px" }}>
            <Form.Control type={props.type} placeholder={props.placeholder} />
          </Col>
        </Form.Group>
      </Form>
    </div>
  );
}