import React from 'react';
import css from './CustomUpload.css';
import _ from "lodash";

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
                <label id='label'>Or you can try...</label>
                {
                    !this.state.show &&
                    <button id='button' type='primary' onClick={this.handleClick}>
                        Upload custom data
                    </button>
                }
                {
                    this.state.show &&
                    <form onSubmit={this.handleSubmit}>
                        <input id='button' type='file' name='filename' onChange={this.handleChange}/>
                        <input id='button' type='submit'/>
                    </form>
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
        let foo = JSON.parse(await this.state.file.text());
        this.props.onSubmit(foo);
    }

    handleClick() {
        this.setState((state) => ({
            show: !state.show,
        }));
    }
}