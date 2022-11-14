import { capitalizeFirstLetter } from '../../GenogramTree.js';
import {AiOutlineClose} from "react-icons/ai"
import "./PopupInfo.css"
import '../shared.css';
import EscapeCloseable from "../escape-closeable/EscapeCloseable";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {FaWikipediaW} from 'react-icons/fa'
import {FcGoogle} from 'react-icons/fc'
import { ButtonGroup } from 'react-bootstrap';

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
    const openInWikipedia = url => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openSearch = name => {
        window.open("http://www.google.com/search?q=" + name, '_blank', 'noopener,noreferrer');
    };

    return (
        <Container>
            <Row className='name-row'>
                <Col key={"Name"}>
                    <h2>{data.get("Name")}</h2>
                </Col>

                <Col key={"Links"}>
                    <ButtonGroup aria-label="LinksGroup">
                        <Button variant="light" className="search" onClick={() => openSearch(data.get("Name"))}>
                            <FcGoogle size={30}/>
                        </Button>

                        {
                            data.has("Wikipedia link") &&
                            <Button variant="light" className="wikilink" onClick={() => openInWikipedia(data.get("Wikipedia link"))}>
                                <FaWikipediaW size={30}/>
                            </Button>
                        }
                    </ButtonGroup>
                </Col>
            </Row>
            <Row>
                <Col key="Description">
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
        return k !== "Name" && k !== "Description" && k !== "Wikipedia link";
      }).map((k) => (
        <Row key={"Row "+k}>
            <Col xs={4} key={k}>
                <p>{k}</p>
            </Col>
            <Col key={data.get(k)}>
                <p>{data.get(k)}</p>
            </Col>
        </Row>
    ));
}

export default PopupInfo