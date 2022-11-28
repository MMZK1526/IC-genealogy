import React from 'react';
import _ from "lodash";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

export class CustomUpload extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
            file: {},
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    render() {
        return (
            <div className='custom-upload'>
                {
                    !this.state.show &&
                    <>
                        <label className="align-middle">Or you can try...</label>
                        <Button className="m-1 align-middle" variant='secondary' onClick={this.handleClick}>
                            Upload custom data
                        </Button>
                    </>
                }
                {
                    this.state.show &&
                    <Form onSubmit={this.handleSubmit} className="w-50 m-auto">
                        <InputGroup>
                            <Form.Control type="file" name='filename' onChange={this.handleChange}/>
                            <Button type='submit' variant="link">Submit</Button>
                        </InputGroup>
                    </Form>
                }
            </div>
        );
    }

    handleChange(event) {
        let file = event.target.files[0];
        this.setState({
            file: file,
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        try {
            let foo = JSON.parse(await this.state.file.text());
            this.props.onSubmit(foo);
        } catch {
            alert("Invalid JSON!");
        }
    }

    handleClick() {
        this.setState((state) => ({
            show: !state.show,
        }));
    }
}
