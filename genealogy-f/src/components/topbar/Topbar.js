import './Topbar.css'

export function Topbar(props) {
    return (
        <div className='topbar'>
            <form onSubmit={props.onSubmit}>
                <label>
                    {'Are you looking for... '}
                </label>
                <select className='dropdown-menu' value={props.state.chosenId} onChange={props.onChange}>
                    {
                        props.state.searchJsons.map((x) => {
                            var birth_year = x.dateOfBirth ? x.dateOfBirth.substring(0,4) : "????";
                            var death_year = x.dateOfDeath ? x.dateOfDeath.substring(0,4) : "????";
                            var birth_place = x.placeOfBirth ? " @ " + x.placeOfBirth.split(',')[1] : "";
                            
                            return <option value={x.id} key={x.id}> {x.name} {"(" + birth_year + "~" + death_year + ")" + birth_place}</option>
                    }
                            
                        )
                    }
                </select>
                <input className='apply-button' type="submit" value="Show tree" />
            </form>
        </div>
    );
}