import { RSocketClient, JsonSerializer, IdentitySerializer } from 'rsocket-core';
import RSocketWebSocketClient from 'rsocket-websocket-client';

// backend ws endpoint
const wsURL = 'ws://localhost:6567/rsocket';
var subscriptor;
var timeOut = [];
var providerRateDelay = 10
// rsocket client
var client;
var controller;

// error handler
const errorHanlder = (e) => {
    console.log("CLOSED... " + e);
    client = null;
    controller.abort();
    setTimeout(connect, 5000);
}
// response handler
const responseHanlder = (payload) => {
    const li = document.createElement('li');
    li.innerText = payload.data.rate;
    li.classList.add('list-group-item', 'small');

    if (payload.data.type == "rate") {
        document.getElementById(payload.data.origin).innerHTML = payload.data.rate;
        clearTimeout(timeOut[payload.data.origin]);
        timeOut[payload.data.origin] = setTimeout(resetCore, 1500, payload.data.origin);
    } else {
        let textArea = document.getElementById(payload.data.origin + "Log");
        appendLog(textArea, payload.data.entry);
    }


    subscriptor.request(1);
    //if (payload.data.origin = "core")
    //console.log(payload.data.origin);
}

const numberRequester = (socket) => {
    socket.requestStream({
        //data: value,
        metadata: String.fromCharCode('logger.stream'.length) + 'logger.stream'
    }).subscribe({
        onError: errorHanlder,
        onNext: responseHanlder,
        onSubscribe: subscription => {
            subscription.request(1); // set it to some max value
            subscriptor = subscription
        }
    });

}

function connect(){

    client = new RSocketClient({
        serializers: {
            data: JsonSerializer,
            metadata: IdentitySerializer
        },
        setup: {
            keepAlive: 60000,
            lifetime: 180000,
            dataMimeType: 'application/json',
            metadataMimeType: 'message/x.rsocket.routing.v0',
        },
        transport: new RSocketWebSocketClient({
            url: wsURL
        })
    });

    controller = new AbortController();

    client.connect().then(sock => {
        numberRequester(sock);
        document.getElementById('startFlow').addEventListener('click', ({ srcElement }) => {
            sock.fireAndForget({
                data: true,
                metadata: String.fromCharCode('logger.start.flow'.length) + 'logger.start.flow'
            });
    
        }, { signal: controller.signal })
        document.getElementById('startLogs').addEventListener('click', ({ srcElement }) => {
            sock.fireAndForget({
                data: true,
                metadata: String.fromCharCode('logger.start.logs'.length) + 'logger.start.logs'
            });
    
        }, { signal: controller.signal })
        document.getElementById('prdp').addEventListener('click', ({ srcElement }) => {
            providerRateDelay += 5
            sock.fireAndForget({
                data: providerRateDelay,
                metadata: String.fromCharCode('logger.provider.rate'.length) + 'logger.provider.rate'
            });
            document.getElementById('prdn').value = providerRateDelay;
        }, { signal: controller.signal })
        document.getElementById('prdm').addEventListener('click', ({ srcElement }) => {
            if (document.getElementById('prdn').value == '10') return;
            providerRateDelay -= 5
            sock.fireAndForget({
                data: providerRateDelay,
                metadata: String.fromCharCode('logger.provider.rate'.length) + 'logger.provider.rate'
            });
            document.getElementById('prdn').value = providerRateDelay;
        }, { signal: controller.signal })
    }, errorHanlder);
}

connect();

deSerializeMsg: ({ data, metadata }) => {
    return {
        data: data != null ? JSON.parse(data) : null,
        metadata: metadata != null ? JSON.parse(metadata) : null
    };
}

function resetCore(what) {
    document.getElementById(what).innerHTML = '0'
}