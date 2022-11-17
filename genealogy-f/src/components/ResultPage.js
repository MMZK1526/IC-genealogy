import './stylesheets/ResultPage.css'
import { ScrollMenu  } from "react-horizontal-scrolling-menu";
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Navigate } from "react-router-dom";
import Toolbar from "../Toolbar";
import Card from "react-bootstrap/Card";
import Container from 'react-bootstrap/Container';
import DefaultImg from "../images/default.png";
import Image from "react-bootstrap/Image";
// import DefaultImg from "../images/wideputin.png";

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
        <>
        <Toolbar onlyHome={true}/>
          <Container className="m-5">
              <h2 className="ml-5">
                  Are you looking for...
              </h2>
              <ScrollMenu className="ml-5">
                {/* <CardGroup> */}
                  {this.rawJSON && this.rawJSON.map((x) => {
                      return <PersonCard
                          itemId={x.id}
                          title={x.name}
                          key={x.id}
                          desc={x.description}
                          imageURL={x.additionalProperties.filter((p) => p.name == 'image').length !== 0 ? 
                          x.additionalProperties.filter((p) => p.name == 'image')[0].value : undefined}
                          onClick={() => {
                            this.id = x.id;
                            this.setState({showTree: true});
                          }}
                      />
                  })}
                {/* </CardGroup> */}
              </ScrollMenu>
          </Container>
          </>
      );
    }
}

function PersonCard({ onClick, title, desc, imageURL}) {
  return (
    <Card style={{ width: '16rem', cursor: 'pointer', height: '24rem' }} className="m-3 result" onClick={onClick}>

      <Card.Body>
        <Card.Title className="mb-2">{title}</Card.Title>
        <Card.Text>
          {desc}
        </Card.Text>
      </Card.Body>

      <Image
        className='bottom align-items-center justify-content-center w-50 m-3 rounded'
        src={imageURL === undefined ? DefaultImg : imageURL}
      />
    </Card>
  );
}

export default withRouter(ResultPage);
