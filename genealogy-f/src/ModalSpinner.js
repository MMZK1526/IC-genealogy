import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';

function ModalSpinner() {
  return (
    <>
      <Card className="my-auto">
          <Card.Body>
              <Spinner
                  as="span"
                  animation="border"
                  className="me-2 align-middle"
                  role="status"
                  aria-hidden="true"
                  />
              <span className="align-middle">Loading...</span>
          </Card.Body>
      </Card>
    </>
  );
}

export default ModalSpinner;