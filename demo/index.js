const babel = require('@babel/core')
const path = require('path')

const file = path.resolve(__dirname, './../demo/demoFile.js')

babel.transformFileSync(file, {
    // babelrc: true,
})

