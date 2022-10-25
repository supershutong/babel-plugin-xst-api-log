const babel = require('@babel/core')
const path = require('path')

const file1 = path.resolve(__dirname, './../demo/index.js')
const file2 = path.resolve(__dirname, './../demo/demoFile.js')
const file3 = path.resolve(__dirname, './../demo/Button.js')

babel.transformFileSync(file1, {
    // babelrc: true,
})

babel.transformFileSync(file2, {
    // babelrc: true,
})

babel.transformFileSync(file3, {
    // babelrc: true,
})
