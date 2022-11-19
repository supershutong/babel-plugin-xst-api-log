const fs = require('fs')
const path = require('path')
const colors = require('colors')
// const madge = require('madge')

// // 输出
// const result = {
//     componentsInCurrentFile: {
//         Button: {lib: 'tinper-bee'}
//     },
//     '@tinper/next-ui': {
//         Input: {local: 'FormControl', api: {}},
//         DatePicker: {local: 'DatePicker', api: {}},
//         RangePicker: {local: 'Range', api: {}},
//         Group: {local: 'CheckboxGroup', api: {}},
//     },
//     'tinper-bee': {Button: {local: 'Button', api: {}}}
// }

const result = {
    componentsInCurrentFile: {}
}

module.exports = ({types: t}, opts) => {
    const {libs = ['@tinper/next-ui', 'tinper-bee'], output = './apiLog.json'} = opts

    return {
        name: 'xst-api-log',
        pre(state) {
            result.componentsInCurrentFile = {}
            console.log(colors.green('[API log] 正在解析：', state.opts.sourceFileName))
        },
        visitor: {
            Identifier(path, state) {
                /** 写入 Menu.SubMenu、Select.Option、DatePicker.RangePicker等子组件及实例方法，如：
                 * 1、const CheckboxGroup = Checkbox.Group
                 * 2、const {RangePicker: Range} = DatePicker
                 * 3、ConfigProvider.registerTheme('blue') 或 解析出实例方法调用 registerTheme('blue')
                 */
                const parentComp = path.parent.object?.name
                const libObj = result.componentsInCurrentFile?.[parentComp]
                if (parentComp && libObj) {
                    const subCompName = path.parent.property.name
                    const local =
                        path.parentPath.parentPath.node.id?.name /* CheckboxGroup */ ||
                        path.parentPath.container.id?.name /* Range */ ||
                        path.node.name

                    // 组件实例上挂载方法需放进组件API内，不能单独声明为组件。如：ConfigProvider.registerTheme('blue')
                    if (
                        result.componentsInCurrentFile[parentComp] &&
                        !/^[A-Z]/.test(subCompName) /** 非大驼峰，避免子组件进入 */
                    ) {
                        if (result.componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        // 实例方法计入API
                        let api = result[libObj.lib][parentComp]?.api || {}
                        api[path.node.name] = path.node.type
                        result[libObj.lib][parentComp].api = api
                        return
                    }
                    result.componentsInCurrentFile[local] = {lib: libObj.lib}
                    result[libObj.lib][subCompName] = {
                        local,
                        api: result[libObj.lib][subCompName]?.api || {}
                    }
                }
            },
            ImportDeclaration(path) {
                const node = path.node
                if (libs.includes(node.source.value)) {
                    // 建仓库
                    if (!result[node.source.value]) {
                        result[node.source.value] = {}
                    }
                }
            },
            ImportSpecifier(path) {
                const node = path.node
                // 来源于目标仓库的组件，写入组件名、别名
                if (libs.includes(path.parent.source.value)) {
                    result[path.parent.source.value][node.imported.name] = {
                        local: node.local.name,
                        api: result[path.parent.source.value][node.imported.name]?.api || {} /** 已录入API不能漏 */
                    }
                    result.componentsInCurrentFile = result.componentsInCurrentFile || {}
                    result.componentsInCurrentFile[node.local.name] = {lib: path.parent.source.value} // 组件所属框架
                }
            },
            JSXIdentifier(path) {
                const parentComp = path.parent.object?.name
                const libObj = result.componentsInCurrentFile?.[parentComp]
                if (parentComp && libObj) {
                    /** 使用子组件做openingElement标签 DatePicker.WeekPicker */
                    const subCompName = path.parent.property.name
                    const local =
                        path.parentPath.parentPath.node.id?.name /* CheckboxGroup */ ||
                        path.parentPath.container.id?.name /* Range */ ||
                        path.node.name

                    result.componentsInCurrentFile[local] = {lib: libObj.lib}
                    result[libObj.lib][subCompName] = {
                        local: subCompName,
                        api: result[libObj.lib][subCompName]?.api || {}
                    }
                }
            },
            // 写属性API
            JSXAttribute(path) {
                const node = path.node
                const nestComp =
                    path.parentPath.parentPath.node?.openingElement.name?.property
                        ?.name /** 使用子组件做openingElement标签 DatePicker.WeekPicker */
                // 写入Tinper-next和Tinper-bee组件API
                const openingElement = path.parent.name.name /** 使用组件做openingElement标签 DatePicker */ || nestComp
                const currentComp = result.componentsInCurrentFile?.[openingElement]
                if (currentComp /* 目标组件 */) {
                    Object.keys(result[currentComp.lib]).forEach((comp, i) => {
                        if (result[currentComp.lib][comp].local === openingElement) {
                            // 使用local，不能直接使用Key，防止同时使用含有相同模块的多个仓库问题，local也处理类似 Input as FormControl用法问题
                            if (node.value === null) {
                                // boolean默认true不写，如：<DatePicker showToday />
                                result[currentComp.lib][comp].api[node.name.name] = 'BooleanLiteral'
                            } else if (node.value?.type === 'JSXExpressionContainer') {
                                // 值为组件/回调
                                result[currentComp.lib][comp].api[node.name.name] = node.value.expression.type
                            } else {
                                result[currentComp.lib][comp].api[node.name.name] =
                                    node.value?.type /* 对象、回调、数组、字符串、bool、空、undefined、number，从property/propertites/elements取值 */
                            }
                        }
                    })
                }
            }
        },
        post(state) {
            this.filePath = path.resolve(__dirname, output)
            fs.writeFileSync(this.filePath, JSON.stringify(result, null, 4), {flag: 'w+'})
            console.log(colors.green('[API log] ', state.opts.sourceFileName, ' 解析完成'))
        }
    }
}
