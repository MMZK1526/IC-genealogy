import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import "./PopupInfo.css"

function PopupInfo(props) {
    return (
        <div className='popup-inner'>
            <button className='close-btn' onClick={props.closePopUp}
            >close</button>
            key: {props.info}
            <h2>Info popup</h2>
            <h4>name</h4>
            <h4>birth</h4>
            <h4>death</h4>
            {props.children}
        </div>
    )
}

export default PopupInfo