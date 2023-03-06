import * as React from 'react'
import {Input} from 'antd'
import {
    ConfigProvider as TConfigProvider,
    Input as FormControl,
    DatePicker,
    Checkbox,
    Button,
    TreeSelect,
    Tooltip
} from '@tinper/next-ui'
import BeeButton from './Button'
import '@tinper/next-ui/dist/tinper-next.css'
import Dragger from './Dragger'

const CheckboxGroup = Checkbox.Group
const {RangePicker: Range} = DatePicker
const registerTheme = TConfigProvider.registerTheme
const SHOW_PARENT = TreeSelect.SHOW_PARENT

/**
 * @desc: 生成DOM
 * @param {mode} 'iframe' | 'noIframe'
 * @returns ReactNode
 */
const AppWrapper = props => {
    let lang = getlang(['en', 'tw', 'zh'])
    TConfigProvider.config({locale: lang})

    return (
        <TConfigProvider locale={lang}>
            <Button className='antd-input'>不要弹窗</Button>
        </TConfigProvider>
    )
}

export default class Page extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            value: ['2', '4']
        }
        registerTheme('blue')
        // TConfigProvider.config({locale: 'zh-cn'})
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
                <DatePicker.WeekPicker mode='week' />
                <Range placeholder={['开始日期', '结束日期']} />
                <CheckboxGroup style={{display: 'inline-block'}} value={this.state.value} readOnly>
                    <Checkbox value='2'>2</Checkbox>
                    <Checkbox readOnly={false} value='3'>
                        3
                    </Checkbox>
                    <Checkbox value='4'>4</Checkbox>
                </CheckboxGroup>
                <Tooltip placement='rightTop' overlay='恭喜你'>
                    {AppWrapper()}
                </Tooltip>
                <TreeSelect
                    style={{width: 300}}
                    dropdownStyle={{maxHeight: 400, overflow: 'auto'}}
                    showCheckedStrategy={SHOW_PARENT}
                    treeDefaultExpandAll
                />
                <Dragger />
                <Button color='info' loading>测试color统计次数</Button>
                <Button color='danger' round>取消</Button>
                <BeeButton type='primary'>提交</BeeButton>
            </div>
        )
    }
}
