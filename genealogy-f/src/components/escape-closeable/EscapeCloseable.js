import React from 'react';
import HotKeys from 'react-hot-keys';
import './EscapeCloseable.css';

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
        this.props.onClick();
    }

    render() {
        return (
            <div>
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