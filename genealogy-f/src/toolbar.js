import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button'
import { BiHomeAlt } from 'react-icons/bi';
import {downloadJsonFile} from './components/custom-upload/exportAsJson';

function Toolbar(props) {
  return (
    <div className='toolbar'>
      <ButtonToolbar>
        <ButtonGroup className="me-2">
          <Button href={'/'} variant="primary" as="a">
            <BiHomeAlt size={30}/>
          </Button>
        </ButtonGroup>
        {!props.onlyHome &&
          <>
            <ButtonGroup className="me-2">
              <Button variant="outline-primary" id="svgButton">
                Export as SVG
              </Button>
              <Button variant="outline-primary" onClick={() => downloadJsonFile(props.genogramTree.state.originalJSON)}>
                Export as JSON
              </Button>
            </ButtonGroup>
            <ButtonGroup className="me-2">
              <Button variant="info" onClick={() => {
                props.genogramTree.setState((prevState) => ({
                  showStats: !prevState.showStats
                }));
              }}>
                Show stats
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button variant='secondary' onClick={props.genogramTree.zoomToDefault}>
                Default zoom
              </Button>
            </ButtonGroup>
          </>
        }
      </ButtonToolbar>
    </div>
  );
}

export default Toolbar;