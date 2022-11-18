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

module.exports = ({types: t}, opts) => {
    const {libs = ['@tinper/next-ui', 'tinper-bee'], output = './apiLog.json'} = opts

    return {
        name: 'xst-api-log',
        pre(state) {
            this.result = {}
            // this.deps = {}
            this.filePath = path.resolve(__dirname, output)
            if (!fs.existsSync(this.filePath)) {
                console.log(colors.green('[API log] 初始化------'))
            } else {
                // madge(this.filename).then( async res => {
                //     this.deps = res.obj()
                //     console.log(colors.green('[API log] 资源依赖获取------'))
                //     // console.log(colors.green('[API log] 资源依赖获取------', this.deps))
                // })
                // const data = fs.readFileSync(this.filePath, 'utf8')
                // console.log(colors.green('[API log] 历史纪录------'))
                // // console.log(colors.green('[API log] 历史纪录------', this.deps, data))
                // this.result = data
                //     ? {...JSON.parse(data), componentsInCurrentFile: {deps: this.deps}}
                //     : {deps: this.deps}
                const data = fs.readFileSync(this.filePath, 'utf8')
                this.result = data ? {...JSON.parse(data), componentsInCurrentFile: {}} : {}
                console.log(colors.green('[API log] json读取成功'))
            }
        },
        visitor: {
            Identifier(path, state) {
                /** 写入 Menu.SubMenu、Select.Option、DatePicker.RangePicker等子组件及实例方法，如：
                 * 1、const CheckboxGroup = Checkbox.Group
                 * 2、const {RangePicker: Range} = DatePicker
                 * 3、ConfigProvider.registerTheme('blue') 或 解析出实例方法调用 registerTheme('blue')
                 */
                const parentComp = path.parent.object?.name
                const libObj = this.result.componentsInCurrentFile?.[parentComp]
                if (parentComp && libObj) {
                    const subCompName = path.parent.property.name
                    const local =
                        path.parentPath.parentPath.node.id?.name /* CheckboxGroup */ ||
                        path.parentPath.container.id?.name /* Range */ ||
                        path.node.name

                    if (this.result.componentsInCurrentFile[parentComp]) {
                        // 组件实例上挂载方法需放进组件API内，不能单独声明为组件。如：ConfigProvider.registerTheme('blue')
                        if (this.result.componentsInCurrentFile[path.node.name]) return // ast多解析出的父节点忽略
                        // 实例方法计入API
                        let api = this.result[libObj.lib][parentComp]?.api || {}
                        api[path.node.name] = path.node.type
                        this.result[libObj.lib][parentComp].api = api
                        return
                    }
                    this.result.componentsInCurrentFile[local] = {lib: libObj.lib}
                    this.result[libObj.lib][subCompName] = {
                        local,
                        api: this.result[libObj.lib][subCompName]?.api || {}
                    }
                }
            },
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
                            if (node.value === null) {
                                // boolean默认true不写，如：<DatePicker showToday />
                                this.result[currentComp.lib][comp].api[node.name.name] = 'BooleanLiteral'
                            } else if (node.value?.type === 'JSXExpressionContainer') {
                                // 值为组件/回调
                                this.result[currentComp.lib][comp].api[node.name.name] = node.value.expression.type
                            } else {
                                this.result[currentComp.lib][comp].api[node.name.name] =
                                    node.value?.type /* 对象、回调、数组、字符串、bool、空、undefined、number，从property/propertites/elements取值 */
                            }
                        }
                    })
                }
            }
        },
        post(state) {
            this.result = JSON.stringify(this.result, null, 4)
            fs.writeFileSync(this.filePath, this.result, {flag: 'w+'})
            console.log(colors.green('[API log] json写入成功'))
        }
    }
}
