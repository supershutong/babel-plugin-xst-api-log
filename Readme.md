# 一个分析组件库 API 调用图谱的 babel 插件

## Install

```sh
npm install -D babel-plugin-xst-api-log
```

## 使用说明
安装依赖后，webpack构建时会自动执行该插件，在指定目录下生成依赖图谱的json文件。

## API

| 参数 | 说明 | 类型 | 默认值 | 版本 |
| --- | --- | --- | --- | --- |
|libs|待分析的组件库列表|string[]|['@tinper/next-ui', 'tinper-bee']|-|
|output|输出的文件路径|string|'./apiLog.json'|-|
