const axios = require('axios');
const https = require('https');
const fs = require('fs');
const { prepareBase64 } = require('./secure');
const agent = new https.Agent({
    ca: fs.readFileSync('./CERT/CA.cert'),
    rejectUnauthorized: true
});

const API_HOST = process.env.API_HOST

const sendAPIRequest = async (method, path, body, retries = 1) => {
    try {
        if(method === 'get'){
            let response = await axios.get(API_HOST+path,
                {
                    headers: {
                        'Authorization': prepareBase64()
                    },
                    httpsAgent: agent // Set the https agent with the certificate
                }
            );

            if(response.data.isError && response.data.code === 7007){
                await new Promise(r => setTimeout(r, 2000));
                throw response.data
            }else{
                return response.data;
            }
        }else if(method === 'post'){
            let response = await axios.post(API_HOST+path,
                body,{
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': prepareBase64()
                    },
                    httpsAgent: agent // Set the https agent with the certificate
                }
            );
            return response.data;
        }

        throw { isError: true, result: 'Wrong method: '+method }
    }catch(e){
        if(retries < 10){
            await new Promise(r => setTimeout(r, 100*retries));
            return await sendAPIRequest(method, path, body, retries+1);
        }else{
            throw e;
        }
    }

}

const updateLastBlock = async (blockid, newBlock, retries = 1) => {
    return await sendAPIRequest(
        'post',
        '/Block',
        { blockid: blockid, block: newBlock }
    )
}

const getConsensusLastBlock = async (retries = 1) => {
    let response = await sendAPIRequest(
        'get',
        '/LastBlock',
        undefined
    )
    return parseInt(response.result);
}

const getDBLastBlock = async (retries = 1) => {
    let response =  await sendAPIRequest(
        'get',
        '/DBLastBlock',
        undefined
    )

    return response.result;
}

const sendOrder = async (orderData, retries = 1) => {
    let response =  await sendAPIRequest(
        'post',
        '/Orders',
        { orderData: {
                    orderid: orderData.orderid,
                    block: orderData.block,
                    timestamp: orderData.timestamp,
                    amount: orderData.amount,
                    fees: orderData.fee,
                    reference: orderData.reference ? orderData.reference : "",
                    sender: orderData.sender,
                    receiver: orderData.receiver
            }
        }
    )

    return response;
}


module.exports = {
    getDBLastBlock,
    getConsensusLastBlock,
    updateLastBlock,
    sendOrder
}
