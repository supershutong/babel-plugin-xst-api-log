import * as React from 'react'
import {Input} from 'antd'
import {ConfigProvider, Input as FormControl, DatePicker, Checkbox} from '@tinper/next-ui'
import BeeButton from './Button'
import '@tinper/next-ui/dist/tinper-next.css'

const CheckboxGroup = Checkbox.Group
const {RangePicker: Range} = DatePicker
const registerTheme = ConfigProvider.registerTheme

export default class Page extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            value: ['2', '4']
        }
        registerTheme('blue')
        ConfigProvider.config({locale: 'zh-cn'})
    }

    onChange = (d, dateString) => {
        console.warn('change--->', d, dateString)
        this.setState({value: d})
    }

    render() {
        return (
            <div className='demoFile'>
                <Input defaultValue='我是输入框' />
                <FormControl type='search' />
                <DatePicker
                    picker='date'
                    showToday
                    showTime={{showSecond: false, format: 'H点m分'}}
                    onChange={this.onChange}
                />
                <DatePicker.WeekPicker mode='week'/>
                <Range placeholder={['开始日期', '结束日期']} />
                <CheckboxGroup style={{display: 'inline-block'}} value={this.state.value} readOnly>
                    <Checkbox value='2'>2</Checkbox>
                    <Checkbox readOnly={false} value='3'>
                        3
                    </Checkbox>
                    <Checkbox value='4'>4</Checkbox>
                </CheckboxGroup>
                <BeeButton type='primary'>提交</BeeButton>
            </div>
        )
    }
}
