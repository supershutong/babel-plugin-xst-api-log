import * as React from 'react'
import {ConfigProvider, DatePicker} from '@tinper/next-ui'

const {RangePicker: Range} = DatePicker
const registerTheme = ConfigProvider.registerTheme

export default class Page extends React.Component {
    constructor() {
        registerTheme('blue')
    }

    render() {
        return (
            <>
                <DatePicker
                    picker='date'
                    showToday
                />
                <Range placeholder={['开始日期', '结束日期']} />
            </>
        )
    }
}
