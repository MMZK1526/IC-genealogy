import './stylesheets/PopupInfo.css'
import './stylesheets/shared.css';
import EscapeCloseable from './EscapeCloseable';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import CloseButton from 'react-bootstrap/CloseButton';

function RelSearchResult(props) {

    return (
        <div className='popup-inner w-50'>
            <EscapeCloseable onClick={props.closeRelSearchResult}>
                <CloseButton className='close-btn' onClick={props.closePopUp} />
                {getRelationsFrom(props.info, props.highlight, props.closePopUp)}
            </EscapeCloseable>
        </div >
    );

    function getRelationsFrom(data, highlight, close) {

        if (data.get('kinship') === undefined) {
            return (
                <label>No valid relationship is found!</label>
            );
        }

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