import './ResultPage.css'
import { ScrollMenu, VisibilityContext  } from "react-horizontal-scrolling-menu";
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Link, Navigate } from "react-router-dom";
import {BiHomeAlt} from "react-icons/bi"

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
          <form className='result-page' onSubmit={async (event) => {
            event.preventDefault();
            if (this.id == null) {
              alert("Haven't selected a person!");
              return;
            }

            this.setState({showTree: true});
          }}>
              <div className="toolbar">
                <Link to={'/'} className='blue-button'>
                    <BiHomeAlt size={30}/>
                </Link>
            </div>
              <div id='title'>
                  {'Are you looking for... '}
              </div>
              <ScrollMenu>
                  {this.rawJSON && this.rawJSON.map((x) => {
                      return <Card
                          itemId={x.id}
                          title={x.name}
                          key={x.id}
                          desc={x.description}
                          onClick={() => this.id = x.id}
                      />
                  })}
              </ScrollMenu>
              <input className='apply-button' type="submit" value="Show tree" />
          </form>
      );
    }
}

function Card({ onClick, selected, title, itemId, desc }) {
    const visibility = React.useContext(VisibilityContext);
  
    return (
        <div className="card" onClick={() => onClick(visibility)} tabIndex="1">
            <div id="name">{title}</div>
            <div id="desc">{desc}</div>
        </div>
    );
  }

export default withRouter(ResultPage);
