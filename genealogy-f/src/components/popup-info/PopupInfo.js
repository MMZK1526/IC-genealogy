import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import { capitalizeFirstLetter } from '../../GenogramTree.js';
import {AiOutlineClose} from "react-icons/ai"
import "./PopupInfo.css"
import EscapeCloseable from "../escape-closeable/EscapeCloseable";

function PopupInfo(props) {
    return (
        <div className='popup-inner'>
        <EscapeCloseable onClick={props.closePopUp}>
                <button className='close-btn' onClick={props.closePopUp}>
                    <AiOutlineClose size={30} color='red'/>
                </button>
                {/* <div class="row"> */}
                {getAdditionalProperties(props.info)}
                {/* </div> */}
        </EscapeCloseable>
        </div>
    )
}

function getAdditionalProperties(data) {
    return (
        
        <div> 
            <h2>{data.get("Name")}</h2>
            {data.has("Description") ? <label className="desc">{capitalizeFirstLetter(data.get("Description"))}<br></br><br></br></label> : ''}
            
            {/* <div className="row">
                <div className="col_key" >
                    {getAttrName(data)}
                </div>
                <div className="col_val" >
                    {getAttrVal(data)}
                </div>
            </div> */}
            {getAllAttr(data)}
            <br></br>
        </div> 
    )
    // return Object.keys(Object.fromEntries(data)).map((k) => (
    //     <div key={k}>
    //         <div key='k'><h4>{k}:  {data.get(k)}</h4></div>
    //     </div>
    // ))
}

function getAllAttr(data) {
    return Object.keys(Object.fromEntries(data)).filter(function (k) {
        return k !== "Name" && k !== "Description";
      }).map((k) => (
        <div className="row" key={k}>
            <div id='col_key'>
                <p>{k}</p>
            </div>
            <div id='col_val'>
                <p>{data.get(k)}</p>
            </div>
        </div>
    ))
}

function getAttrName(data) {
    return Object.keys(Object.fromEntries(data)).filter(function (k) {
        return k !== "Name";
      }).map((k) => (
        <div id='key' key={k}>
            <p>{k}</p>
        </div>
    ))
}

function getAttrVal(data) {
    return Object.keys(Object.fromEntries(data)).filter(function (k) {
        return k !== "Name";
      }).map((k) => (
        <div id='val' key={data.get(k)}>
            <p>{data.get(k)}</p>
        </div>
    ))
}

export default PopupInfo