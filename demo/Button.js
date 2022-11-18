import * as React from 'react'
import {Button} from 'tinper-bee'
import {Input} from '@tinper/next-ui'

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
        const {size, children, ...others} = this.props
        return (
            <div>
                <Input size='lg' disabled onChange={(value)=>{console.log(value)}} />
                <Button size={size || 'lg'} {...others}>
                    {children}{JSON.stringify(others)}
                </Button>
            </div>
        )
    }
}
