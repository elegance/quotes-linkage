requirejs.config({
    paths: {
        'ko': 'https://cdn.bootcss.com/knockout/3.4.1/knockout-min',
        'axios': 'https://cdn.bootcss.com/axios/0.15.3/axios.min',
        'socket.io': 'https://cdn.bootcss.com/socket.io/1.7.2/socket.io.min',
        'lodash': 'https://cdn.bootcss.com/lodash.js/4.17.4/lodash.min',
        'simpleQuote': '/js/simpleQuote'
    }
});

require(['ko', 'axios', 'socket.io', 'lodash', 'simpleQuote'], function(ko, axios, io, _, simpleQuote) {
    var viewNode = document.querySelector('#tb-ko-position');

    axios.get('/data/position.json')
        .then((resp) => {
            var data = resp.data.data;

            var getRowCodeFn = (row) => row.code + '.' + row.market;

            promiseGenKoRowsViewModel(data, getRowCodeFn , [
                {
                    attr: 'price', // 当前价位动态信息
                    computed: function(gt, row) {
                        return gt(getRowCodeFn(row));
                    }
                },{
                    attr: 'positionPrice', // 市值为动态信息
                    computed: function(gt, row) {
                        return (row.price() * row.position).toFixed(2);
                    }
                }
            ]).then((rowsViewModel) => {
                ko.cleanNode(viewNode);
                ko.applyBindings(rowsViewModel, viewNode);
            });
        });
    
    function promiseGenKoRowsViewModel(datas, depCodesFn, computedInfoArr) {
        var subCodes = _(datas.map(data => depCodesFn(data))).flattenDeep().compact().uniq(); //一行可能依赖多个股票代码、多行之间可能有重复

        // 调用公共方法 订阅
        return simpleQuote.subscribe('nsp-ko-position', subCodes, (newQuote) => {
            // console.log('有新的行情推送至客户端:', newQuote);
        }).then((gt) => { //此处的gt 可以用来 访问 上面 subCodes的任意一个股票的行情了
            var rowsViewModel = new RowsViewModel(datas, depCodesFn, computedInfoArr, gt);
            simpleQuote.nsps['nsp-ko-position'].onNewQuote = rowsViewModel.processQuote;
            return rowsViewModel;
        });
    }

    /**
     * 生成一个 ko可以使用的 ViewModel
     * @datas 数据集合 数组
     * @depCodesFn 每个数组元素计算依赖的股票代码的方法
     * @computedInfoArr 需要动态计算的属性表达式
     * @gt 可以获取对应股票代码价格的方法
     */
    function RowsViewModel(datas, depCodesFn, computedInfoArr, gt) {
        var self = this;

        self._depCodes = _(datas.map(data => depCodesFn(data))).flattenDeep().compact().uniq(); //一行可能依赖多个股票代码、多行之间可能有重复
        self.datas = ko.observableArray();

        // init
        datas.forEach(function (item) {
            var row = new Row(item, depCodesFn, computedInfoArr, gt);
            self.datas.push(row);
        });

        // process Quote
        self.processQuote = function (quote) {
            if (self._depCodes.indexOf(quote[0]) > -1) { //判断当前数据集合是否依赖新推送的股票代码
                self.datas().forEach(function (row) {
                    row.processQuote(quote);
                });
            }
        };
    }

    function Row(row, depCodesFn, computeInfoArr, gt) {
        var self = this;

        // 作为computed的依赖
        self._num = ko.observable(0);
        self._depCodes = depCodesFn(row); //一行可能依赖多个股票代码、多行之间可能有重复
        if (!Array.isArray(self._depCodes)) {
            self._depCodes = [self._depCodes];
        }

        for (var a in row) {
            if (!a.startsWith('_')) {
                self[a] = row[a];
            }
        }

        // 计算表达式
        computeInfoArr.forEach(function (cptInfo) {
            self[cptInfo.attr] = ko.computed(function () {
                return +cptInfo.computed(gt, self) + (self._num() - self._num()); // 加上并减去 _num 来达到依赖
            });
        });

        // 更新依赖触发 computed
        self.processQuote = function (quote) {
            if (self._depCodes.indexOf(quote[0]) > -1) { //当前这一行 依赖股票代码时就修改 _num
                self._num(new Date().getTime()); 
            }
        };
    }
});