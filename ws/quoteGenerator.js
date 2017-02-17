var _ = require('lodash');
var allStockData = require('./stockData');
var socketServer = require('./socketServer');

var allCodes = Object.keys(allStockData);
var codesLen = allCodes.length;

var initAllQuote = allCodes.reduce((accumulator, code) => {
    accumulator[code] = _.ceil(_.random(5, 100, true), 2); // 生成 5-100 的浮点数字、并格式化为两位小数作为价格
    return accumulator;
}, {});

// 初始化socketServer中的行情
socketServer.initQuote(initAllQuote);

// 定时来刷新行情
setInterval( ()=> {
    // 随机取一个股票代码
    var code = allCodes[_.random(0, codesLen-1)];

    // 更新价格 单次价格随机 波动 -0.2-0.2 间
    var newPrice = socketServer.gt(code) + _.random(-0.2, 0.2);
    socketServer.pushQuote(code, _.ceil(newPrice, 2));
}, 1);

module.exports = {
    listen: socketServer.listen
}