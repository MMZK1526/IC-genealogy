import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button'
import { BiHomeAlt } from 'react-icons/bi';
import {downloadJsonFile} from './components/exportAsJson';
import { AiFillFilter } from 'react-icons/ai';

function Toolbar(props) {
  return (
    <div className="d-flex m-2 justify-content-between pe-auto">
      <ButtonToolbar>
        <ButtonGroup className="me-2">
          <Button href={'/'} variant="primary" as="a" onClick={() => {
              props.genogramTree.treeCache = {};
          }}>
            <BiHomeAlt size={30}/>
          </Button>
        </ButtonGroup>
        {!props.onlyHome &&
          <>
            <ButtonGroup className="me-2">
              <Button variant="info" id="svgButton">
                Export as SVG
              </Button>
              <Button variant="info" onClick={() => downloadJsonFile(props.genogramTree.state.originalJSON)}>
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
            {/*<ButtonGroup className="me-2">*/}
            {/*  <Button variant='secondary' onClick={props.genogramTree.zoomToDefault}>*/}
            {/*    Default zoom*/}
            {/*  </Button>*/}
            {/*</ButtonGroup>*/}
            {
              props.genogramTree.state.newDataAvailable &&
              <ButtonGroup className="me-2">
                <Button className="show-full-data-button" variant="secondary" onClick={() => {
                  console.log("Load Full Data!");
                  props.genogramTree.loadRelations(props.genogramTree.state.newData, props.genogramTree.state.newData.targets[0].id);
                  props.genogramTree.setState({
                    newDataAvailable: false
                  });
                }}>Load Full Data</Button>
              </ButtonGroup>
            }
          </>
        }
      </ButtonToolbar>
      {!props.onlyHome &&
          <Button className="me-4" variant='warning' onClick={() => { 
            props.genogramTree.setState({
              showFilters: !props.genogramTree.state.showFilters
            });
            }}>
              <AiFillFilter size={30} className="align-middle"/>
              <span className="align-middle">Filter</span>
          </Button>
      }
    </div>
  );
}

export default Toolbar;