const symbolSelectElement = document.getElementById('symbol');
const intervalSelectElement = document.getElementById('interval');
const tradesContainerList = document.querySelector('.trades-container-list');

let candlesStream = null;
let tradesStream = null;

const chart = LightweightCharts.createChart(document.getElementById('chart'), {
    layout: {
        backgroundColor: '#222222',
        textColor: 'rgba(255,255,255,0.7)',
    },
    grid: {
        vertLines: {
            color: 'rgba(255,255,255,0.2)',
        },
        horzLines: {
            color: 'rgba(255,255,255,0.2)',
        },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    }
});
const candlestickSeries = chart.addCandlestickSeries();

window.addEventListener('resize', () => {
    chart.resize(
        document.documentElement.clientWidth * 4 / 5,
        document.documentElement.clientHeight * 4 / 5,
    );
});

symbolSelectElement.addEventListener('change', () => {
    candlesStream.close();
    tradesStream.close();
    tradesContainerList.innerHTML = '';

    const symbol = symbolSelectElement.value;
    const interval = intervalSelectElement.value;

    setHistoryCandles(symbol, interval);
    streamCandles(symbol, interval);
    streamTrades(symbol);

})
intervalSelectElement.addEventListener('change', () => {
    candlesStream.close();

    tradesContainerList.innerHTML = '';

    const symbol = symbolSelectElement.value;
    const interval = intervalSelectElement.value;

    setHistoryCandles(symbol, interval);
    streamCandles(symbol, interval);
    streamTrades(symbol);
})

const symbol = symbolSelectElement.value;
const interval = intervalSelectElement.value;

setHistoryCandles(symbol, interval);
streamCandles(symbol, interval);
streamTrades(symbol);

function setHistoryCandles(symbol, interval) {
    fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1500`)
        .then(resp => resp.json())
        .then(candlesArr => candlestickSeries.setData(
            candlesArr.map(([time, open, high, low, close]) => ({
                time: time / 1000,
                open,
                high,
                low,
                close
            }))
        ));
}

function streamCandles(symbol, interval) {
    candlesStream = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);
    candlesStream.onmessage = event => {
        const {
            t: time,
            o: open,
            c: close,
            h: high,
            l: low
        } = JSON.parse(event.data).k;
        candlestickSeries.update({
            time: time / 1000,
            open,
            high,
            low,
            close
        });
    }
}

function streamTrades(symbol) {
    tradesStream = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@aggTrade`);
    tradesStream.onmessage = event => {
        const {
            m: isBuyerMaker,
            p: price,
            q: quantity
        } = JSON.parse(event.data);
        const tradeElement = document.createElement('div');
        tradeElement.classList.add('trade', isBuyerMaker ? 'sell' : 'buy');
        tradeElement.innerHTML = `
            <span>${price}</span>
            <span>${quantity}</span>
            <span>${(price * quantity).toFixed(2)}</span>
        `;
        tradesContainerList.prepend(tradeElement);

        if (tradesContainerList.children.length > 50) {
            tradesContainerList.children[tradesContainerList.children.length - 1].remove();
        }
    }
}
