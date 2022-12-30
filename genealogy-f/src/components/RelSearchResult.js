import './stylesheets/PopupInfo.css'
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import CloseButton from 'react-bootstrap/CloseButton';

// Show kinship relations after the user searched for the relationship between two people
function RelSearchResult(props) {
    /// If the search result contains people that are not in the graph, we ask the user if they'd
    /// like a re-render and show those people
    if (props.relSearchState[0] === 1) {
        return (
            <div className='popup-inner w-50 overflow-auto' style={{ maxHeight: "80vh" }}>
                <CloseButton className='close-btn' onClick={() => {
                    props.relSearchState[0] = 3;
                    props.closePopUp();
                }} />
                <Button
                    className='text-start'
                    variant='link'
                    onClick={() => {
                        props.relSearchState[0] = 2;
                        props.closePopUp();
                    }}>{'This relation contains people that are not in the graph. Click me to show them.'}
                </Button>
            </div >
        );
    }

    return (
        <div className='popup-inner w-50 overflow-auto' style={{ maxHeight: "80vh" }}>
            <CloseButton className='close-btn' onClick={props.closePopUp} />
            {getRelationsFrom(props.info, props.highlight, props.closePopUp)}
        </div >
    );

    function getRelationsFrom(data, highlight, close) {
        if (!data || data.get('kinship') === undefined) {
            return (
                <label>No valid relationship is found!</label>
            );
        }

        let validRelations = data.get('kinship').filter((v) => v.path[0] === props.root);

        if (validRelations.length === 0) {
            return (
                <label>No valid relationship is found!</label>
            );
        }

        // Kinships are stored as a list of individuals, and the first element is the "1st person"
        // in the relationship. We check if this person is the root we want
        return (
            data.get('kinship').filter((v) => v.path[0] === props.root).map((v, ix) => (
                <Row key={'Inner Row ' + v.kinship + ' ' + ix}>
                    <Button
                        className='text-start'
                        variant='link'
                        onClick={() => {
                            highlight.length = 0;
                            for (const name of v.path) {
                                highlight.push(name);
                            }
                            close();
                        }}>{v.kinship}
                    </Button>
                </Row>
            )));
    }
}

export default RelSearchResult
