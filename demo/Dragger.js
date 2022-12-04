/**
 * @title 拖拽上传
 * @description 文件以拖拽的形式上传。
 */

import {Icon, Upload} from '@tinper/next-ui'
import React, {Component} from 'react'

const Dragger = Upload.Dragger

const demo6props = {
    multiple: true,
    enterDragger() {
        console.log('拖拽进入')
    },
    leaveDragger() {
        console.log('拖拽离开')
    }
}

class Demo6 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            cb: {
                showUploadList: false,
                action: '/upload.do',
                onChange(info) {
                    const status = info.file.status
                    if (status !== 'uploading') {
                        console.log(info.file, info.fileList)
                    }
                    if (status === 'done') {
                        console.log(`${info.file.name} file uploaded successfully.`)
                    } else if (status === 'error') {
                        console.log(`${info.file.name} file upload failed.`)
                    }
                }
            }
        }
    }

    render() {
        return (
            <div style={{marginTop: 16, height: 180}}>
                <Dragger {...demo6props} {...this.state.cb}>
                    <Icon type='inbox' className='uf-upload' />
                </Dragger>
            </div>
        )
    }
}

export default Demo6
