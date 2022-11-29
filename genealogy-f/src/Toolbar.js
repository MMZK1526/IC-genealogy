import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button'
import { BiHomeAlt } from 'react-icons/bi';
import { downloadJsonFile } from './components/exportAsJson';
import { AiFillFilter } from 'react-icons/ai';
import { MdPersonSearch } from 'react-icons/md';
import { GrGroup } from 'react-icons/gr';

function Toolbar(props) {
  return (
    <div className="d-flex m-2 justify-content-between pe-auto">
      <ButtonToolbar>
        <ButtonGroup className="me-2">
          <Button href={'/'} variant="primary" as="a" onClick={() => {
            props.genogramTree.treeCache = {};
          }}>
            <BiHomeAlt size={30} />
          </Button>
        </ButtonGroup>
        {!props.onlyHome &&
          <>
            <ButtonGroup className="me-2">
              <Button variant="info" id="svgButton">
                Export as SVG
              </Button>
              <Button variant="info" onClick={() => downloadJsonFile(props.genogramTree.state.relationJSON)}>
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
            <ButtonGroup className="me-2">
              <Button variant='secondary' onClick={props.genogramTree.flipZoomSwitch}>
                Default zoom
              </Button>
            </ButtonGroup>
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
        <ButtonToolbar className="me-4">
          <Button className="me-2" variant='secondary' onClick={() => {
            props.genogramTree.setState({
              showRelations: false,
              showLookup: !props.genogramTree.state.showLookup,
              showGroups: false,
              showFilters: false,
            });
          }}>
            <MdPersonSearch size={30} className="align-middle" />
            <span className="align-middle"> Lookup</span>
          </Button>

          <Button className="me-2" variant='warning' onClick={() => {
            props.genogramTree.setState({
              showRelations: false,
              showLookup: false,
              showGroups: !props.genogramTree.state.showGroups,
              showFilters: false,
            });
          }}>
            <GrGroup size={30} className="align-middle me-1" />
            <span className="align-middle"> Group</span>
          </Button>

          <Button className="me-2" variant='warning' onClick={() => {
            props.genogramTree.setState({
              showRelations: false,
              showLookup: false,
              showGroups: false,
              showFilters: !props.genogramTree.state.showFilters,
            });
          }}>
            <AiFillFilter size={30} className="align-middle" />
            <span className="align-middle"> Filter</span>
          </Button>
        </ButtonToolbar>
      }
    </div>
  );
}

export default Toolbar;