const fs = require('fs')
const path = require('path')
const colors = require('colors')

// // 输出
// const result = {
//     componentsInCurrentFile: {
//         Button: {lib: 'tinper-bee'}
//     },
//     '@tinper/next-ui': {
//         Input: {local: 'FormControl', api: {}},
//         DatePicker: {local: 'DatePicker', api: {}}
//     },
//     'tinper-bee': {Button: {local: 'Button', api: {}}}
// }

module.exports = ({types: t}, opts) => {
    const {libs = ['@tinper/next-ui', 'tinper-bee'], output = './apiLog.json'} = opts

    return {
        name: 'xst-api-log',
        pre(state) {
            this.result = {}
            this.filePath = path.resolve(__dirname, output)
            if (!fs.existsSync(this.filePath)) {
                console.log(colors.green('[API log] 初始化------'))
            } else {
                fs.readFile(this.filePath, 'utf8', (err, data) => {
                    if (err) {
                        console.log(colors.red('[API log] 读取失败'), err)
                    } else {
                        console.log(colors.green('[API log] 读取成功'))
                        this.result = data ? JSON.parse(data.toString()) : {}
                    }
                })
            }
        },
        visitor: {
            ImportDeclaration(path) {
                const node = path.node
                if (libs.includes(node.source.value)) {
                    // 建仓库
                    if (!this.result[node.source.value]) {
                        this.result[node.source.value] = {}
                    }
                }
            },
            ImportSpecifier(path) {
                const node = path.node
                // 来源于目标仓库的组件，写入组件名、别名
                if (libs.includes(path.parent.source.value)) {
                    this.result[path.parent.source.value][node.imported.name] = {
                        local: node.local.name,
                        api: {}
                    }
                    this.result.componentsInCurrentFile = this.result.componentsInCurrentFile || {}
                    this.result.componentsInCurrentFile[node.local.name] = {lib: path.parent.source.value} // 组件所属框架
                }
            },
            // 写属性API
            JSXAttribute(path) {
                const node = path.node
                // 写入Tinper-next和Tinper-bee组件API
                const currentComp = this.result.componentsInCurrentFile?.[path.parent.name.name]
                if (currentComp /* 目标组件 */) {
                    Object.keys(this.result[currentComp.lib]).forEach((comp, i) => {
                        if (this.result[currentComp.lib][comp].local === path.parent.name.name) {
                            // 使用local，不能直接使用Key，防止同时使用含有相同模块的多个仓库问题，local也处理类似 Input as FormControl用法问题
                            this.result[currentComp.lib][comp].api[node.name.name] =
                                node.value?.type /* 对象、回调、数组、字符串、bool、空、undefined、number，从property/propertites/elements取值 */
                        }
                    })
                }
            }
        },
        post(state) {
            this.result = JSON.stringify(this.result, null, 4)
            fs.writeFile(this.filePath, this.result, {flag: 'w+'}, (err, data) => {
                if (err) {
                    console.log(colors.red('[API log] 写入失败'), err)
                } else {
                    console.log(colors.green('[API log] 写入成功'))
                }
            })
        }
    }
}
