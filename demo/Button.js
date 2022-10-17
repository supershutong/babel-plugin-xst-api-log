import * as React from 'react'
import {Button} from 'tinper-bee'

export class BeeButton extends React.Component {
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
        return <Button size='lg'>提交</Button>
    }
}
