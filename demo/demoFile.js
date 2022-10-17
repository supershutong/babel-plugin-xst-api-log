import * as React from 'react'
import {Input} from 'antd'
import {Input as FormControl, DatePicker, Checkbox} from '@tinper/next-ui'
import {Button} from 'tinper-bee'
// import {Button} from './Button'
import '@tinper/next-ui/dist/tinper-next.css'

const CheckboxGroup = Checkbox.Group
const {RangePicker: Range} = DatePicker

export class Page extends React.Component {
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
        return (
            <div className='demoFile'>
                <FormControl defaultValue='我是输入框' />
                <Input value='1234' />
                <DatePicker
                    picker='date'
                    showToday
                    showTime={{showSecond: false, format: 'H点m分'}}
                    onChange={this.onChange}
                />
                <Range placeholder={['开始日期', '结束日期']} />
                <CheckboxGroup style={{display: 'inline-block'}} value={this.state.value} readOnly>
                    <Checkbox value='2'>2</Checkbox>
                    <Checkbox readOnly={false} value='3'>
                        3
                    </Checkbox>
                    <Checkbox value='4'>4</Checkbox>
                </CheckboxGroup>
                <Button size='lg'>提交</Button>
            </div>
        )
    }
}
