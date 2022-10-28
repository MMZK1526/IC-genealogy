import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import "./PopupInfo.css"

function PopupInfo(props) {
    return (
        <div className='popupInfo'>
            <div className='popup-inner'>
                <button className='close-btn' onClick={props.closePopUp}
                >close</button>
                key: {props.info}
                {props.children}
            </div>
        </div>
    )
}

export default PopupInfo