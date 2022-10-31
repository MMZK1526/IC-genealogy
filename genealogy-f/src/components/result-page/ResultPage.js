import './ResultPage.css'

export function ResultPage(props) {
    return (
        <form className='result-page'>
            <div id='title'>
                {'Are you looking for... '}
            </div>
            <div>
                <select id='select' value={props.state.chosenId} onChange={props.onChange}>
                    {
                        props.state.searchJsons.map((x) => {
                            const des = x.description ? " - " + x.description : ""
                            
                            return <option value={x.id} key={x.id}> {x.name} {des}</option>
                    }
                            
                        )
                    }
                </select>
            </div>
            
            <input className='apply-button' type="submit" value="Show tree" />
        </form>
    );
}