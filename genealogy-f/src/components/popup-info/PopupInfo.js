import { capitalizeFirstLetter } from '../../GenogramTree.js';
import {AiOutlineClose} from "react-icons/ai"
import "./PopupInfo.css"
import '../shared.css';
import EscapeCloseable from "../escape-closeable/EscapeCloseable";

function PopupInfo(props) {
    const onNew = (_) => {
        props.onNew();
        props.closePopUp();
    };

    const onExtend = (_) => {
        props.onExtend();
        props.closePopUp();
    };

    return (
        <div className='popup-inner'>
            <EscapeCloseable onClick={props.closePopUp}>
                <button className='close-btn' onClick={props.closePopUp}>
                    <AiOutlineClose size={30} color='red'/>
                </button>
                {getAdditionalProperties(props.info)}
                <div className='extend-search'>
                    <button className='new-search-button blue-button' onClick={onExtend}>
                        Extend tree from this person
                    </button>
                    <button className='new-search-button blue-button' onClick={onNew}>
                        Use this person as root
                    </button>
                </div>
            </EscapeCloseable>
        </div>
    );
}

function getAdditionalProperties(data) {
    return (
        
        <div> 
            <h2>{data.get("Name")}</h2>
            {
                data.has("Description") &&
                <label className="desc">
                    {capitalizeFirstLetter(data.get("Description"))}
                    <br></br>
                    <br></br>
                </label>
            }
            {getAllAttr(data)}
            <br></br>
        </div> 
    )
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

export default PopupInfo