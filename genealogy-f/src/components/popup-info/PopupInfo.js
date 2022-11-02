import Button from 'react-bootstrap/Button';
import {FilterForm} from '../filter/Filter.js'
import React from "react";
import {AiFillCloseCircle} from "react-icons/ai"
import "./PopupInfo.css"

function PopupInfo(props) {
    return (
        <div className='popup-inner'>
            <button className='close-btn' onClick={props.closePopUp}>
                <AiFillCloseCircle size={40} color='darkred'/>
            </button>
            {/* <div class="row"> */}
            {getAdditionalProperties(props.info)}
            {/* </div> */}
             
        </div>
    )
}

function getAdditionalProperties(data) {
    return (
        
        <div> 
            <h2>{data.get("Name")}</h2>          
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
        </div> 
    )
    // return Object.keys(Object.fromEntries(data)).map((k) => (
    //     <div key={k}>
    //         <div key='k'><h4>{k}:  {data.get(k)}</h4></div>
    //     </div>
    // ))
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