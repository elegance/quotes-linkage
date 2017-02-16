(function(global) {
    var socket = io.connect('/simpleStocks');

    global.simpleQuote = new SimpleQuote();
    socket.on('message', global.simpleQuote.onMessage);
    socket.on('batchMessage', global.simpleQuote.onBatchMessage);

    function noop() {}

    function SimpleQuote() {
        var that = this;
        that.nsps = {}; // 依赖行情的有那些命名空间
        that.refs = {}; // 代码 以及其依赖计数: {600361: 1, 600362: 4}
        that.quotesInfo = {}; // 所有股票价格信息: {600361: 12.51, 600362: 5.25}

        function NspInfo(nspName, codes, onNewQuote, quoteDeferred) {
            this.nspName = nspName; // 订阅行情的命名空间（多个模块共用一个socket通道订阅行情）
            this.codes = codes; // 当前命名空间订阅的股票代码
            this.onNewQuote = onNewQuote; // 新行情push过来触发的回调
            this.quoteDeferred = quoteDeferred; // 当前订阅的所有的代码都已经ready
        }

        // 同一个namespace 只订阅一组股票代码
        this.subcribe = function(nsp, codes, onNewQuote) {
            var dfd = {};
            var promise = new Promise((resolve, reject) => dfd = {resolve, reject});

            var codes = _(codes).uniq().value(),
                newSubs = [], // 该命名空间新订阅的代码（命名空间在翻页时被重复利用）
                unSubs = [], // 该命名空间取消订阅的代码（命名空间在翻页时被重复利用）
                needSubs = [], // 通道需要新订阅的代码 
                needUnsubs = [], // 通道需要减少订阅的代码（节省通信流量，不再推送不订阅的代码）
                nspInfo = that.nsps[nsp] || new NspInfo(nsp, codes, onNewQuote, dfd);

            newSubs = _(codes).difference(nspInfo.codes).value();
            unSubs = _(nspInfo.codes).difference(codes).value();
            nspInfo.codes = codes;
            nspInfo.onNewQuote = onNewQuote;
            nspInfo.quoteDeferred = dfd;
            that.nsps[nsp] = nspInfo;

            newSubs.forEach(function(code) {
                that.refs[code] = (that.refs[code] || (needSubs.push(code) && 0)) + 1;
            });

            unSubs.forEach(function(code) {
                that.refs[code] = (that.refs[code] > 1) ? (that.refs[code] - 1) : (needUnsubs.push(code) && 0);
            });

            if (needSubs.length > 0) {
                socket.emit('appendMessage', nsp + ':' + needSubs.join(','));
            } else {
                setTimeout(function() {
                    dfd.resolve(gt); //没有新订阅的股票，直接resolve
                });
            }
            if (needUnsubs.length > 0) {
                socket.emit('unsubcribe', needUnsubs.join(','));
            }

            return promise;
        };

        // 获取某个股票的行情(gt 方法不可暴露给外部直接使用, 因为gt方法不保证获取所有代码的行情，需要先promise一些股票代码，再返回gt方法供使用)
        var gt = function(code) {
            var r = that.quotesInfo[code];

            if (isNaN(r)) {
                r = 0;
                console.error('没有找到该股票(%s)的行情 ，现有处理返回0。 \n 1. 确保使用之前有调用方法订阅该股票  2. 检查股票代码是否为不存在的代码', code)
            }
            return r;
        };

        // 批量返回的行情
        this.onBatchMessage = function(msg) {
            var msgPair = msg.split(':'),
                nspName = msgPair[0],
                priceStr = msgPair[1];

            priceStr.split('|').forEach(function(pairStr) {
                var pair = pairStr.split(',');
                that.quotesInfo[pair[0]] = pair[1];
            });
            that.nsps[nspName].quoteDeferred.resolve(gt);
        };

        //单个推送的行情消息
        this.onMessage = function(msgPair) {
            var pair = msgPair.split(',');
            that.quotesInfo[pair[0]] = pair[1];

            for (var nsp in that.nsps) {
                var nspInfo = that.nsps[nsp];

                if (nspInfo.codes.indexOf(pair[0]) >= 0) {
                    nspInfo.onNewQuote(pair);
                }
            }
        };
    }
})(window);