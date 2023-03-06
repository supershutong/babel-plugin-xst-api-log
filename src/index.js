const fs = require('fs')
const url = require('url')
const chalk = require('chalk')

let componentsInCurrentFile = {}
let exportAllLibs = {
    // '@tinper/next-ui': '/xxxxx/xst/babel-plugin-xst-api-log/demo/compents.js'
}

const result = {}

const getParentPath = (path, argumentsName) => {
    let target = path?.contexts[0].scope.bindings?.[argumentsName]
    if (target) {
        return target?.path.context.parentPath
    } else {
        return getParentPath(path?.contexts[0].parentPath, argumentsName)
    }
}

const getParentClass = path => {
    if (path.parentPath?.container.expression?.callee.name === '_createClass') {
        return path.parentPath.parentPath
    } else {
        return getParentClass(path.parentPath)
    }
}

const getRestExpressions = arg => {
    let restExpressions = [arg.property?.name]
    let obj = arg.object
    while (obj) {
        if (obj?.type === 'ThisExpression') {
            restExpressions.unshift('this')
            break
        }
        if (obj.property?.name) {
            restExpressions.unshift(obj.property.name)
        }
        obj = obj.object
    }

    return restExpressions
}

const getTargetLib = (sourceValue, currentFilePath) => {
    let targetLib = {
        lib: '',
        sourcePath: ''
    }
    Object.keys(exportAllLibs).forEach(lib => {
        if (exportAllLibs[lib] === url.resolve(currentFilePath, sourceValue)) {
            targetLib = {
                lib,
                sourcePath: exportAllLibs[lib]
            }
        }
    })

    return targetLib
}

module.exports = ({types: t}, opts) => {
    const {libs = ['@tinper/next-ui', 'tinper-bee'], output = './apiLog.json'} = opts

    return {
        name: 'xst-api-log',
        pre(state) {
            componentsInCurrentFile = {}
            console.log(chalk.green('[API log] 正在解析：', state.opts.parserOpts.sourceFileName))
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
                const libObj = componentsInCurrentFile?.[parentCompLocal]
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
                        componentsInCurrentFile?.[parentCompLocal] &&
                        result[libObj.lib]?.[parentComp] &&
                        !/^[A-Z]/.test(subCompName) /** 非大驼峰，避免子组件进入 */
                    ) {
                        if (componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        // 实例方法计入API
                        let api = result[libObj.lib][parentComp]?.api || {}
                        api[path.node.name] = api[path.node.name] ? api[path.node.name] + 1 : 1
                        // api[path.node.name] = path.node.type
                        result[libObj.lib][parentComp].api = api
                        return
                    } else if (!/[^A-Z_]+/.test(subCompName)) {
                        if (componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        /** 组件抛出的常量需计入组件API */
                        let api = result[libObj.lib][parentComp]?.api || {}
                        api[path.node.name] = api[path.node.name] ? api[path.node.name] + 1 : 1
                        // api[path.node.name] = 'ConstValue'
                        result[libObj.lib][parentComp].api = api
                        return
                    }
                    componentsInCurrentFile[local] = {lib: libObj.lib}
                    if (result[libObj.lib]) {
                        result[libObj.lib][`${parentComp}.${subCompName}`] = {
                            local,
                            api: result[libObj.lib]?.[`${parentComp}.${subCompName}`]?.api || {}
                        }
                    }
                }
            },
            ExportAllDeclaration(path, state) {
                const node = path.node,
                    value = node.source.value
                if (libs.includes(value)) {
                    // export * from ''@tinper/next-ui' 导出组件
                    // 建仓库
                    if (!exportAllLibs[value]) {
                        exportAllLibs[value] = state.filename
                    }
                }
            },
            ImportDeclaration(path, state) {
                const node = path.node,
                    value = node.source.value
                const targetLib = getTargetLib(value, state.filename)

                if (libs.includes(value)) {
                    // 建仓库
                    if (!result[value]) {
                        result[value] = {}
                    }
                } else if (targetLib.sourcePath) {
                    // export * 语法二次包装后引入
                    // 建仓库
                    if (targetLib.lib && !result[targetLib.lib]) {
                        result[targetLib.lib] = {}
                    }
                }
            },
            ImportSpecifier(path, state) {
                const node = path.node,
                    value = path.parent.source.value
                const targetLib = getTargetLib(value, state.filename)
                // 来源于目标仓库的组件，写入组件名、别名
                if (libs.includes(value)) {
                    result[value][node.imported.name] = {
                        local: node.local.name,
                        api: result[value][node.imported.name]?.api || {} /** 已录入API不能漏 */
                    }
                    componentsInCurrentFile = componentsInCurrentFile || {}
                    componentsInCurrentFile[node.local.name] = {lib: value} // 组件所属框架
                } else if (targetLib.sourcePath) {
                    result[targetLib.lib][node.local.name] = {
                        local: node.local.name,
                        api: result[targetLib.lib][node.local.name]?.api || {} /** 已录入API不能漏 */
                    }
                    componentsInCurrentFile = componentsInCurrentFile || {}
                    componentsInCurrentFile[node.local.name] = {lib: targetLib.lib} // 组件所属框架
                }
            },
            JSXIdentifier(path) {
                const parentCompLocal = path.parent.object?.name
                if (!parentCompLocal) return
                const libObj = componentsInCurrentFile?.[parentCompLocal]
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

                    componentsInCurrentFile[local] = {lib: libObj.lib}
                    if (result[libObj.lib]) {
                        result[libObj.lib][`${parentComp}.${subCompName}`] = {
                            local: subCompName,
                            api: result[libObj.lib]?.[`${parentComp}.${subCompName}`]?.api || {}
                        }
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
                const currentComp = componentsInCurrentFile?.[openingElement]
                if (currentComp /* 目标组件 */) {
                    Object.keys(result[currentComp.lib]).forEach((comp, i) => {
                        if (result[currentComp.lib][comp].local === openingElement) {
                            // 使用local，不能直接使用Key，防止同时使用含有相同模块的多个仓库问题，local也处理类似 Input as FormControl用法问题
                            let api = result[currentComp.lib][comp].api
                            result[currentComp.lib][comp].api[node.name.name] = api[node.name.name]
                                ? api[node.name.name] + 1
                                : 1
                            // if (node.value === null) {
                            //     // boolean默认true不写，如：<DatePicker showToday />
                            //     result[currentComp.lib][comp].api[node.name.name] = 'BooleanLiteral'
                            // } else if (node.value?.type === 'JSXExpressionContainer') {
                            //     // 值为组件/回调
                            //     result[currentComp.lib][comp].api[node.name.name] = node.value.expression.type
                            // } else {
                            //     result[currentComp.lib][comp].api[node.name.name] =
                            //         node.value?.type /* 对象、回调、数组、字符串、bool、空、undefined、number，从property/propertites/elements取值 */
                            // }
                        }
                    })
                }
            },
            // 写 ... spread 展开属性，如： <DatePicker {...config} />
            JSXSpreadAttribute(path) {
                const node = path.node
                const nestComp =
                    path.parentPath.parentPath.node?.openingElement.name?.property
                        ?.name /** 使用子组件做openingElement标签 DatePicker.WeekPicker */
                // 写入Tinper-next和Tinper-bee组件API
                const openingElement = path.parent.name.name /** 使用组件做openingElement标签 DatePicker */ || nestComp
                const currentComp = componentsInCurrentFile?.[openingElement]
                if (currentComp /* 目标组件 */) {
                    Object.keys(result[currentComp.lib]).forEach((comp, i) => {
                        if (result[currentComp.lib][comp].local === openingElement) {
                            // 使用local，不能直接使用Key，防止同时使用含有相同模块的多个仓库问题，local也处理类似 Input as FormControl用法问题
                            const argumentsName = node.argument?.name /** 1、var声明式目标变量名 config */
                            if (argumentsName) {
                                let containers = getParentPath(path, argumentsName)?.container
                                if (containers) {
                                    containers = Array.from(containers)
                                    for (let container of containers) {
                                        if (container.type === 'VariableDeclaration') {
                                            // 声明类restProps
                                            const declaration = container?.declarations?.[0]
                                            if (declaration?.id.name === argumentsName) {
                                                /** 查到 config 变量 */
                                                const properties = declaration.init.properties
                                                properties?.forEach(property => {
                                                    /** 属性列表，遍历 */
                                                    let api = result[currentComp.lib][comp].api
                                                    result[currentComp.lib][comp].api[property.key.name] = api[
                                                        property.key.name
                                                    ]
                                                        ? api[property.key.name] + 1
                                                        : 1
                                                    // if (property.value.type === 'JSXExpressionContainer') {
                                                    //     // 值为组件/回调
                                                    //     result[currentComp.lib][comp].api[property.key.name] =
                                                    //         property.value.expression.type
                                                    // } else {
                                                    //     result[currentComp.lib][comp].api[property.key.name] =
                                                    //         property.value.type // 写入变量名 key => value
                                                    // }
                                                })
                                            }
                                        }
                                    }
                                }
                            } else if (node.argument.type === 'MemberExpression') {
                                let restExpressions = getRestExpressions(node.argument)
                                if (restExpressions[0] === 'this' && restExpressions[1] === 'state') {
                                    /** 2、this.state.config声明变量 */
                                    let containers = getParentClass(path)?.container
                                    if (containers) {
                                        containers = Array.from(containers)
                                        for (let container of containers) {
                                            if (container.type === 'FunctionDeclaration') {
                                                const body = container.body?.body
                                                const states = body.find(value => {
                                                    return (
                                                        value.type === 'ExpressionStatement' &&
                                                        value.expression.type === 'AssignmentExpression' &&
                                                        value.expression.left.property?.name === 'state'
                                                    )
                                                }).expression.right?.properties
                                                const properties = states.find(state => {
                                                    return state.key?.name === restExpressions[2]
                                                }).value?.properties

                                                /** 查到 config 变量 */
                                                properties?.forEach(property => {
                                                    /** 属性列表，遍历 */
                                                    let api = result[currentComp.lib][comp].api
                                                    result[currentComp.lib][comp].api[property.key.name] = api[
                                                        property.key.name
                                                    ]
                                                        ? api[property.key.name] + 1
                                                        : 1
                                                    // if (property.value.type === 'JSXExpressionContainer') {
                                                    //     // 值为组件/回调
                                                    //     result[currentComp.lib][comp].api[property.key.name] =
                                                    //         property.value.expression.type
                                                    // } else {
                                                    //     result[currentComp.lib][comp].api[property.key.name] =
                                                    //         property.value.type // 写入变量名 key => value
                                                    // }
                                                })
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    })
                }
            }
        },
        post(state) {
            fs.writeFileSync(output, JSON.stringify(result, null, 4), {flag: 'w+'})
            console.log(chalk.green('[API log] ', state.opts.parserOpts.sourceFileName, ' 解析完成'))
        }
    }
}
