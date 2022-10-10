import * as React from 'react'
import {Input} from 'antd'
import {Input as FormControl, DatePicker, Checkbox} from 'tdesign-react'
import {Button} from '@arco-design/web-react'
import 'tdesign-react/es/style/index.css'; // 少量公共样式

const CheckboxGroup = Checkbox.Group

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
