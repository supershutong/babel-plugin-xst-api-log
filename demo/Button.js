import * as React from 'react'
import {Button} from 'tinper-bee'

export default class BeeButton extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            value: ['2', '4']
        }
    }

    onChange = (d, dateString) => {
        console.warn('change--->', d, dateString)
        this.setState({value: d})
    }

    render() {
        const {size, ...others} = this.props
        return (
            <Button size={size || 'lg'} {...others}>
                提交
            </Button>
        )
    }
}
