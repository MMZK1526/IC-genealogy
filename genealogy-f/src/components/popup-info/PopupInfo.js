import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import "./PopupInfo.css"

function PopupInfo(props) {
    return (
        <div className='popup-inner'>
            <button className='close-btn' onClick={props.closePopUp}
            >close</button>
            <div>
                {getAdditionalProperties(props.info)}
            </div>
             
        </div>
    )
}

function getAdditionalProperties(data) {
    Object.keys(Object.fromEntries(data)).map((k) => {
        console.log(k);
    })
    return Object.keys(Object.fromEntries(data)).map((k) => (
        <div key={k}>
            <div key='k'><h4>{k}:  {data.get(k)}</h4></div>
        </div>
    ))
}

export default PopupInfo