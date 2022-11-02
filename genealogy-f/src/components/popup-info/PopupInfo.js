import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import "./PopupInfo.css"

function PopupInfo(props) {
    return (
        <div className='popup-inner'>
            <button className='close-btn' onClick={props.closePopUp}
            >close</button>
            {/* <div class="row"> */}
            {getAdditionalProperties(props.info)}
            {/* </div> */}
             
        </div>
    )
}

function getAdditionalProperties(data) {
    return (
        <div className="row">
            <div className="col_key" >
                {/* <h2>Attributes</h2> */}
                {getAttrName(data)}
            </div>
            <div className="col_val" >
                {/* <h2>Values</h2> */}
                {getAttrVal(data)}
            </div>
        </div>
    )
    // return Object.keys(Object.fromEntries(data)).map((k) => (
    //     <div key={k}>
    //         <div key='k'><h4>{k}:  {data.get(k)}</h4></div>
    //     </div>
    // ))
}

function getAttrName(data) {
    return Object.keys(Object.fromEntries(data)).map((k) => (
        <div id='key' key={k}>
            <h4>{k}</h4>
        </div>
    ))
}

function getAttrVal(data) {
    return Object.keys(Object.fromEntries(data)).map((k) => (
        <div id='val' key={data.get(k)}>
            <h4>{data.get(k)}</h4>
        </div>
    ))
}

export default PopupInfo