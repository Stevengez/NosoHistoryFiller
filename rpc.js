const getRPCcommand = async (command, params) => {
    try {
        let response = await fetch('http://127.0.0.1:8000', {
            method: 'POST',
            body: JSON.stringify({
                "jsonrpc": "2.0",
                "method": command,
                "params": params.split(" "),
                "id": 9
            })
        });

        let parsed = await response.json();
        return {
            isError: false,
            result: parsed.result[0]
        }
    }catch(e){
        throw {
            isError: true,
            message: e.message,
            stack: e.stack
        }
    }
}

const getBlockInfo = async (block, retries = 1) => {
    try{
        let response = await getRPCcommand('getblockorders', `${block}`)
        return response;
    }catch(err){
        if(retries < 10){
            console.log("Error retrieveing block info from RPC server, retrying...");
            await new Promise(r => setTimeout(r, 100*retries));
            return await getBlockInfo(block, retries+1);
        }else{
            throw {
                isError: true,
                result: err.message,
                stack: err.stack
            }
        }
    }
}

const getOrderInfo = async (orderId, retries = 1) => {
    try{
        let response = await getRPCcommand('getorderinfo', `${orderId}`)
        return response;
    }catch(err){
        if(retries < 10){
            console.log("Error retrieveing order info from RPC server, retrying...");
            await new Promise(r => setTimeout(r, 100*retries));
            return await getOrderInfo(orderId, retries+1);
        }else{
            throw {
                isError: true,
                result: err.message,
                stack: err.stack
            }
        }
    }
}

const getMainnetInfo = async (retries = 1) => {
    try{
        let response = await getRPCcommand('getmainnetinfo', "")
        return response;
    }catch(err){
        if(retries < 10){
            console.log("Error retrieveing mainnet info from RPC server, retrying...");
            await new Promise(r => setTimeout(r, 100*retries));
            return await getMainnetInfo(retries+1);
        }else{
            throw {
                isError: true,
                result: err.message,
                stack: err.stack
            }
        }
    }
}

module.exports = {
    getBlockInfo,
    getOrderInfo,
    getMainnetInfo
}