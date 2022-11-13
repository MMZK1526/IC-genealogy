import { capitalizeFirstLetter } from '../../GenogramTree.js';
import {AiOutlineClose} from "react-icons/ai"
import "./PopupInfo.css"
import '../shared.css';
import EscapeCloseable from "../escape-closeable/EscapeCloseable";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function PopupInfo(props) {
    const onNew = (_) => {
        props.onNew();
        props.closePopUp();
    };

    const onExtend = (_) => {
        props.onExtend();
        props.closePopUp();
    };

    return (
        <div className='popup-inner'>
            <EscapeCloseable onClick={props.closePopUp}>
                <button className='close-btn' onClick={props.closePopUp}>
                    <AiOutlineClose size={30} color='red'/>
                </button>
                {getAdditionalProperties(props.info)}
                <Container className="text-center">
                    <Button variant="primary" onClick={onExtend} className="m-1">
                        Extend tree from this person
                    </Button>
                    <Button variant="primary" onClick={onNew}>
                        Use this person as root
                    </Button>
                </Container>
            </EscapeCloseable>
        </div>
    );
}

function getAdditionalProperties(data) {
    return (
        <Container>
            <Row>
                <Col>
                <h2>{data.get("Name")}</h2>
                </Col>
            </Row>
            <Row>
                <Col>
                    {data.has("Description") &&
                        <p className="fst-italic">
                            {capitalizeFirstLetter(data.get("Description"))}
                        </p>}
                </Col>
            </Row>
            <Row>
                <Container className="overflow-auto additional-properties-container">
                    {getAllAttr(data)}
                </Container>
            </Row>
        </Container>
    );
}

function getAllAttr(data) {
    return Object.keys(Object.fromEntries(data)).filter(function (k) {
        return k !== "Name" && k !== "Description";
      }).map((k) => (
        <Row>
            <Col xs={4} key={k}>
                <p>{k}</p>
            </Col>
            <Col>
                <p>{data.get(k)}</p>
            </Col>
        </Row>
    ));
}

export default PopupInfo