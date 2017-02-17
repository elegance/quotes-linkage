## 行情联动测试相关
* express 模拟后台 持仓数据接口，socket.io 后台推送行情价格
* 前台使用vue/react/ko 方式来实现数据实时更新视图

## 安装启动

#### npm
```
# npm install
# npm start 
```

#### yarn
```
# yarn install
# yarn start
```

## 访问
* [ko 的效果](http://127.0.0.1:3000/ko-position.html)
* [vue的效果](http://127.0.0.1:3000/vue-position.html)


## 问题
1. 使用`vue` [http://127.0.0.1:3000/vue-position.html](http://127.0.0.1:3000/vue-position.html)怎么完成`ko`已经达到的效果，即: [http://127.0.0.1:3000/ko-position.html](http://127.0.0.1:3000/ko-position.html)
    * 当前价、市值根据后台实时变动
    * 前面的复选框、或者文本选中时 数据更新时仍保持选中
2. 怎样做到以下支持
    * 解耦，行情有可能等待较长、异常的情况，使行情支持异步化，先渲染静态数据，依赖行情的部分, 使用loading的效果图，行情达到是再渲染