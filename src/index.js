const fs = require('fs')
const colors = require('colors')

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
                const parentCompLocal = path.parent.object?.name
                if (!parentCompLocal) return
                const libObj = result.componentsInCurrentFile?.[parentCompLocal]
                if (!libObj) return
                let parentComp = parentCompLocal
                for (let comp in result[libObj.lib]) {
                    if (
                        result[libObj.lib][comp].local === parentComp &&
                        comp.indexOf('.') < 0 /** 修复parentComp被重复添加成DatePicker.WeekPicker.WeekPicker问题 */
                    ) {
                        parentComp = comp
                    }
                }
                if (parentComp && libObj) {
                    const subCompName = path.parent.property.name
                    const local =
                        path.parentPath.parentPath.node.id?.name /* CheckboxGroup */ ||
                        path.parentPath.container.id?.name /* Range */ ||
                        path.node.name

                    // 1、组件实例上挂载方法需放进组件API内，不能单独声明为组件。如：ConfigProvider.registerTheme('blue')
                    // 2、组件抛出的常量需放进组件API内，不能单独声明为组件。如：TreeSelect.SHOW_PARENT
                    if (
                        result.componentsInCurrentFile[parentCompLocal] &&
                        result[libObj.lib][parentComp] &&
                        !/^[A-Z]/.test(subCompName) /** 非大驼峰，避免子组件进入 */
                    ) {
                        if (result.componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        // 实例方法计入API
                        let api = result[libObj.lib][parentComp].api || {}
                        api[path.node.name] = path.node.type
                        result[libObj.lib][parentComp].api = api
                        return
                    } else if (!/[^A-Z_]+/.test(subCompName)) {
                        if (result.componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        /** 组件抛出的常量需计入组件API */
                        let api = result[libObj.lib][parentComp].api || {}
                        api[path.node.name] = 'ConstValue'
                        result[libObj.lib][parentComp].api = api
                        return
                    }
                    result.componentsInCurrentFile[local] = {lib: libObj.lib}
                    result[libObj.lib][`${parentComp}.${subCompName}`] = {
                        local,
                        api: result[libObj.lib][`${parentComp}.${subCompName}`]?.api || {}
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
                const parentCompLocal = path.parent.object?.name
                if (!parentCompLocal) return
                const libObj = result.componentsInCurrentFile?.[parentCompLocal]
                if (!libObj) return
                let parentComp = parentCompLocal
                for (let comp in result[libObj.lib]) {
                    if (
                        result[libObj.lib][comp].local === parentComp &&
                        comp.indexOf('.') < 0 /** 修复parentComp被重复添加成DatePicker.WeekPicker.WeekPicker问题 */
                    ) {
                        parentComp = comp
                    }
                }
                if (parentComp && libObj) {
                    /** 使用子组件做openingElement标签 DatePicker.WeekPicker */
                    const subCompName = path.parent.property.name
                    const local =
                        path.parentPath.parentPath.node.id?.name /* CheckboxGroup */ ||
                        path.parentPath.container.id?.name /* Range */ ||
                        path.node.name

                    result.componentsInCurrentFile[local] = {lib: libObj.lib}
                    result[libObj.lib][`${parentComp}.${subCompName}`] = {
                        local: subCompName,
                        api: result[libObj.lib][`${parentComp}.${subCompName}`]?.api || {}
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
            },
            // 写 ... spread 展开属性，如： <DatePicker {...yourConfig} />
            JSXSpreadAttribute(path) {
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
                            const argumentsName = node.argument.name /** 要查找的目标变量名 yourConfig */
                            const containers =
                                path.contexts[0].scope.bindings[argumentsName].path.context.parentPath
                                    .container /** uploaderConfig */

                            for (let container of containers) {
                                const declaration = container.declarations?.[0]
                                if (declaration?.id.name === argumentsName) {
                                    /** 查到 yourConfig 变量 */
                                    const properties = declaration.init.properties
                                    properties.forEach(property => {
                                        /** 属性列表，遍历 */
                                        if (property.value.type === 'JSXExpressionContainer') {
                                            // 值为组件/回调
                                            result[currentComp.lib][comp].api[property.key.name] =
                                                property.value.expression.type
                                        } else {
                                            result[currentComp.lib][comp].api[property.key.name] = property.value.type // 写入变量名 key => value
                                        }
                                    })
                                }
                            }
                        }
                    })
                }
            }
        },
        post(state) {
            fs.writeFileSync(output, JSON.stringify(result, null, 4), {flag: 'w+'})
            console.log(colors.green('[API log] ', state.opts.sourceFileName, ' 解析完成'))
        }
    }
}
