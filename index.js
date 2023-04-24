const mongoose = require('mongoose');
const uri = "mongodb://noso:Nosodb850@localhost:27017/nosohistory?authMechanism=DEFAULT&authSource=nosohistory";

const rpc = require('./rpc');
const controller = require('./controller');

mongoose.connect(uri)
.then(() => {
    console.log("# DB Connection Susccess");
    console.log("");
})
.catch((err) => {
    console.log("# DB Connection Error", err);
    console.log("");
});

const resumeCycle = async () => {
    const mnResult = await rpc.getMainnetInfo();
    const mnCurrentBlock = mnResult.result;
    const currentDbBlock = await controller.getLastBlock();

    console.log("# Resuming Order History Creation");
    console.log("# Last Mainnet Block: ", mnCurrentBlock.lastblock);
    console.log("# DB last saved Block: ", currentDbBlock.highest);
    console.log("");

    if(parseInt(currentDbBlock.highest) < mnCurrentBlock.lastblock){
        console.log("# Creating task for ", mnCurrentBlock.lastblock-currentDbBlock.highest, "missing blocks");
        console.log("");

        let processingBlock = currentDbBlock.highest+1;
        while(processingBlock <= mnCurrentBlock.lastblock){
            let response = await rpc.getBlockInfo(processingBlock);
            let blockData = response.result;

            if(blockData.valid && blockData.block == processingBlock){
                let orders = blockData.orders;
                if(orders.length > 0){
                    console.log("#########################################");
                    console.log("# Starting block", processingBlock);
                    console.log("# Found", orders.length, "orders");
                    
                    for(let o of orders){
                        let response = await rpc.getOrderInfo(o.orderid);
                        let orderData = response.result.order;
                        let sender = await controller.getAddress(orderData.sender, processingBlock);
                        let receiver = await controller.getAddress(orderData.receiver, processingBlock);

                        let newTx = await controller.createOrder({
                            orderid: orderData.orderid,
                            block: orderData.block,
                            timestamp: orderData.timestamp,
                            amount: orderData.amount,
                            fees: orderData.fee,
                            reference: orderData.reference?orderData.reference:"",
                            sender: orderData.sender,
                            receiver: orderData.receiver
                        });

                        await controller.addOrderToAddress(sender._id, newTx);
                        await controller.addOrderToAddress(receiver._id, newTx);
                    }
                    let blockRes = await controller.updateBlock(currentDbBlock._id, processingBlock);
                    console.log("# Latest burned block updated: ", blockRes.highest);
                    console.log("#########################################");
                    console.log("");
                }else{
                    blockRes = await controller.updateBlock(currentDbBlock._id, processingBlock);
                    console.log(`# Skipped ${blockRes.highest} but burned it.`);
                }

                processingBlock++;
            }else{
                throw {
                    isError: true,
                    result: "RPC returned the wrong block data, expecting: "+processingBlock+" but got: "+blockData.result.block
                }
            }
        }
        
        const ttNextBlock = 600-Math.ceil(Date.now()/1000 % 600)+50;
        console.log("Scheduled next sync in ", ttNextBlock);
        setTimeout(resumeCycle, ttNextBlock*1000);
    }else{
        const ttNextBlock = 600-Math.ceil(Date.now()/1000 % 600)+50;
        console.log("Scheduled next sync in ", ttNextBlock);
        setTimeout(resumeCycle, ttNextBlock*1000);
    }
};


resumeCycle();

