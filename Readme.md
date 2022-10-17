# 一个分析组件库 API 调用图谱的 babel 插件

## Install

```sh
npm install -D babel-plugin-xst-api-log
```

## API

| 参数 | 说明 | 类型 | 默认值 | 版本 |
| --- | --- | --- | --- | --- |
|libs|待分析的组件库列表|string[]|['@tinper/next-ui', 'tinper-bee']|-|
|output|输出的文件路径|string|'./apiLog.json'|-|
