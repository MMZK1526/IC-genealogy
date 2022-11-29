import React from 'react';
import HotKeys from 'react-hot-keys';
import './stylesheets/EscapeCloseable.css';

export default class EscapeCloseable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            visible: true,
        };
        this.onEscape = this.onEscape.bind(this);
    }

    onEscape() {
        this.setState({
            visible: false,
        });
        if (this.props.onClick) {
            this.props.onClick();
        }
    }

    componentDidMount() {
        document.getElementById("escapeCloseableFocus").focus();
    }

    render() {
        return (
            <div tabIndex={0} id='escapeCloseableFocus'>
                {
                    this.state.visible &&
                    <HotKeys
                        keyName='escape'
                        onKeyDown={this.onEscape}
                    >
                        {this.props.children}
                    </HotKeys>
                }
            </div>
        );
    }
}