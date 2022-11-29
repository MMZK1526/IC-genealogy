import React from 'react';
import HotKeys from 'react-hot-keys';
import './stylesheets/EscapeCloseable.css';

export default class EscapeCloseableEnterClickable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            visible: true,
        };
    }

    render() {
        return (
            <div tabIndex={0} id='escapeCloseableFocus'>
                {
                    this.state.visible &&
                    <HotKeys
                        keyName='escape,enter'
                        onKeyDown={this.onKeyDown}
                    >
                        {this.props.children}
                    </HotKeys>
                }
            </div>
        );
    }

    componentDidMount() {
        document.getElementById("escapeCloseableFocus").focus();
    }

    onKeyDown = (keyName) => {
        if (keyName === 'escape') {
            this.onEscape();
        }
        if (keyName === 'enter') {
            this.onEnter();
        }
    }

    onEscape = () => {
        this.setState({
            visible: false,
        });
        if (this.props.onClick) {
            this.props.onClick();
        }
    }

    onEnter = () => {
        if (this.props.onEnterClick) {
            this.props.onEnterClick();
        }
    }
}