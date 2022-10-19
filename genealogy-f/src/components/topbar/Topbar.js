import { useState } from 'react';
import './Topbar.css'

export function Topbar(props) {
    // const [open, setOpen] = useState(false);
    return (
        <div className='topbar'>
            <form onSubmit={props.onSubmit}>
                <label>
                    {'Are you looking for... '}
                </label>
                <select className='dropdown-menu' value={props.state.chosenId} onChange={props.onChange}>
                    {
                        props.state.searchJsons.map((x) =>
                            <option value={x.id} key={x.id}>{x.name}</option>
                        )
                    }
                </select>
                <input className='apply-button' type="submit" value="Show tree" />
            </form>
        </div>
    );
}