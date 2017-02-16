var socketio = require('socket.io');
var _ = require('lodash');


var socket = socketio();
var stocksInfo = {
    simpleQuotes: {}, // 简要的行情信息，结构：{600361.SH: 12.21, 600362.SH: 3.82}
    clients: [] // 连接的客户端
};

// 连接到简要行情的socket
socket.of('/simpleStocks').on('connection', function(client) {
    console.log('connected...')
    client.subCodes = [];

    // 
    /**
     * 接受客户端订阅指定股票，多个股票用“,”逗号分隔
	 * @param msg 结构：请求ID:股票代码1,股票代码2 如：requestId:600361.SH,000380.SZ
	 */
    client.on('subscribe', function(msg) {
        console.log(msg);
        var msgPair = msg.split(':'),
            reqId = msgPair[0],
            codesStr = msgPair[1];

        client.subCodes = _(codesStr.split(',')).compact().uniq().value(); //按逗号分隔、去重记录客户端需要的代码
        returnSimpleQuotes(client.subCodes, reqId); 
    });

    // 客户端追加订阅指定的股票，追加多个股票用“,”逗号分隔
    client.on('appendSubscribe', function(msg) {
        var msgPair = msg.split(':'),
            reqId = msgPair[0],
            codesStr = msgPair[1],
            newSubCodes = _(codesStr.split(',')).compact().uniq().value();

        client.subCodes = _(client.subCodes).union(newSubCodes).value();
        returnSimpleQuotes(newSubCodes, reqId); //返回新订阅的行情
    });

    function returnSimpleQuotes(codes, reqId) {
        var retMsg = reqId ? (reqId + ':') : '';
		
		for (var i = 0, len = codes ? codes.length : 0; i < len; i++) {
			retMsg += codes[i] + ',' + stocksInfo.simpleQuotes[codes[i]] + '|';
		}
		client.emit('batchMessage', retMsg.replace(/\|$/, ''));
    }

    	// 取消订阅一些行情
	client.on('unsubcribe', function(msg) {
		var unSubCodes = _(msg.split(',')).compact().uniq().value();
		
		client.subCodes = _(client.subCodes).difference(unSubCodes).value();
	});
	
	// 取消所有订阅
	client.on('unsubscribeAll', function(msg) {
		client.subCodes = [];
		client.subscribeAll = false;
	});
	
	// 订阅所有
	client.on('subscribeAll', function(msg) {
		client.subCodes = [];
		client.subscribeAll = true;
		var retMsg = '';
		
		for (var c in stocksInfo.simpleQuotes) {
			retMsg += c + ',' + stocksInfo.simpleQuotes[c] + '|';
		}
		client.emit('batchMessage', retMsg.replace(/\|$/, ''));
	});
});

var socketServer = {
    // 初始化行情
    initQuote: function(allQuote) {
        stocksInfo.simpleQuotes = allQuote;
    },

    // 更新股票代码价格
    pushQuote: function(code, price) {
        stocksInfo.simpleQuotes[code] = price;
    },

    // socket.io 依赖的http server
    listen: function(server) {
        socket.listen(server);
    },

    // 根据代码获取价格
    gtCodePrice: function(code) {
        return stocksInfo.simpleQuotes[code];
    }
};

module.exports = socketServer;