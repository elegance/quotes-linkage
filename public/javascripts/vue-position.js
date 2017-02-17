requirejs.config({
    paths: {
        'vue': 'https://cdn.bootcss.com/vue/2.1.10/vue.min',
        'axios': 'https://cdn.bootcss.com/axios/0.15.3/axios.min',
        'socket.io': 'https://cdn.bootcss.com/socket.io/1.7.2/socket.io.min',
        'lodash': 'https://cdn.bootcss.com/lodash.js/4.17.4/lodash.min',
        'simpleQuote': '/javascripts/simpleQuote'
    }
});

require(['vue', 'axios', 'socket.io', 'simpleQuote'], function(Vue, axios, io, simpleQuote) {
    var app = new Vue({
        el: '#app',
        data: {
            datas: []
        },
        computed: {
            price: function() {
                // ?
            }
        }
    });

    axios.get('/data/position.json')
        .then((resp) => {
            var data = resp.data.data;
            app.datas = data;

            // 生成订阅的完整代码数组 ：代码 + "." + 市场
            var subCodes = data.map(item => item.code + '.' + item.market);

            // 调用公共方法 订阅
            simpleQuote.subscribe('nsp-vue-position', subCodes, (newQuote) => {
                console.log('有新的行情推送至客户端:', newQuote);
            }).then((gt) => { //此处的gt 可以用来 访问 上面 subCodes的任意一个股票的行情了
                console.log(`所有订阅的股票：${subCodes}， 可以访问其价格了。`)
                console.log(`如 ${subCodes[0]} : ${gt(subCodes[0])}`);
            });

        });
});