import React from 'react'
import {Upload, Button} from '@tinper/next-ui'

const Dragger = Upload.Dragger

const forMatFileData = files => {
    files.forEach(file => {
        file.uid = file.fid
        file.name = file.name || file.fileName || (file.title && `${file.title}.${file.fileExt}`)
        file.size = file.filesize
    })
    return files
}
const UploadFile = ({bridgeRemove, fileList = [], accept, test = '-----'}) => {
    const uploadrConfig = {
        action: `/rest/doc/upload`,
        accept: accept,
        test,
        fileList: [...forMatFileData(fileList)],
        showUploadList: {
            showRemoveIcon: true,
            removeIcon: ' x '
        },
        onRemove(removeFile) {
            bridgeRemove(removeFile)
        }
    }

    const btnType = 'success'

    return (
        <Dragger {...uploadrConfig}>
            <p className='u-upload-text'>123</p>
            <Button type={btnType}>按钮</Button>
        </Dragger>
    )
}

export default UploadFile
