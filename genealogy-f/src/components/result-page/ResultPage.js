import './ResultPage.css'
import { ScrollMenu, VisibilityContext  } from "react-horizontal-scrolling-menu";
import React from 'react';

const getItems = () =>
    Array(20)
        .fill(0)
        .map((_, ind) => ({ id: `element-${ind}` }));

export function ResultPage(props) {
    const [items, setItems] = React.useState(getItems);
    const [selected, setSelected] = React.useState([]);
    const [position, setPosition] = React.useState(0);

    const isItemSelected = (id) => !!selected.find((el) => el === id);

    const handleClick =
        (id) =>
        ({ getItemById, scrollToItem }) => {
            const itemSelected = isItemSelected(id);

        setSelected((currentSelected) =>
            itemSelected
            ? currentSelected.filter((el) => el !== id)
            : currentSelected.concat(id)
        );

        props.onChange(id)
    };

    return (
        <form className='result-page' onSubmit={props.onSubmit}>
            <div id='title'>
                {'Are you looking for... '}
            </div>
            <ScrollMenu>
                {props.state.searchJsons.map((x) => {
                    // const desc = x.description ? " - " + x.description : ""
                    return <Card
                        itemId={x.id}
                        title={x.name}
                        key={x.id}
                        desc={x.description}
                        onClick={handleClick(x.id)}
                        // selected={isItemSelected(id)}
                    />
                })}
            </ScrollMenu>
            <input className='apply-button' type="submit" value="Show tree" />
        </form>
    );
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