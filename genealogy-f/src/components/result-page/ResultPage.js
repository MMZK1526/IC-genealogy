import './ResultPage.css'
import { ScrollMenu, VisibilityContext  } from "react-horizontal-scrolling-menu";
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Link, Navigate } from "react-router-dom";
import {BiHomeAlt} from "react-icons/bi"
import Button from "react-bootstrap/Button";
import Toolbar from "../../toolbar";
import Card from "react-bootstrap/Card";

function withRouter(Component) {
  function ComponentWithRouterProp(props) {
    let location = useLocation();
    let navigate = useNavigate();
    let params = useParams();
    return (
      <Component
        {...props}
        router={{ location, navigate, params }}
      />
    );
  }

  return ComponentWithRouterProp;
}

class ResultPage extends React.Component {
    constructor(props) {
      super(props);
      this.rawJSON = props.router.location.state ? props.router.location.state.result : null;
      this.state = {
        showTree: false
      };
      this.id = null;
    }

    render() {
      if (this.state.showTree) {
        return (<Navigate to="/tree" replace={true} state={{source: this.id, relations: null}}/>);
      }
      return (
          <form className='result-page'>
              <Toolbar onlyHome={true}/>
              <div id='title'>
                  {'Are you looking for... '}
              </div>
              <ScrollMenu>
                  {this.rawJSON && this.rawJSON.map((x) => {
                      return <PersonCard
                          itemId={x.id}
                          title={x.name}
                          key={x.id}
                          desc={x.description}
                          onClick={() => {
                            this.id = x.id;
                            this.setState({showTree: true});
                          }}
                      />
                  })}
              </ScrollMenu>
          </form>
      );
    }
}

function PersonCard({ onClick, selected, title, itemId, desc }) {
  
    return (
      <Card style={{ width: '18rem', cursor: 'pointer' }} className="m-3" onClick={onClick}>
        <Card.Body>
          <Card.Title className="mb-2">{title}</Card.Title>
          <Card.Text>
            {desc}
          </Card.Text>
        </Card.Body>
      </Card>
    );
  }

export default withRouter(ResultPage);
