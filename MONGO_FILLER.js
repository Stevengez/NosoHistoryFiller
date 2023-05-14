const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const uri = `mongodb://${process.env.MONGO_API_USER}:${process.env.MONGO_API_PWD}@${process.env.MONGO_API_HOST}:${process.env.MONGO_API_PORT}/${process.env.MONGO_API_DB}?authMechanism=DEFAULT&authSource=${process.env.MONGO_API_DB}`;
const controller = require('./controller');
const rpc = require('./rpc');

const resumeCycle = async () => {
    console.log("# Resuming Order History Creation");
    try {
        let conn = await mongoose.connect(uri);
        console.log("# MongoDB Connection Successful - OK");
    }catch(e){
        throw "MongoDB Connection Error, Restarting service in 1 minute...";
    }

    const mnResult = await rpc.getMainnetInfo();
    const mnCurrentBlock = mnResult.result;
    const currentDbBlock = await controller.getLastBlock();

    
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
			if(o.fee !== undefined || o.fees !== undefined){
				let newOrder = await controller.createOrder({...o, fees: o.fees !== undefined ? o.fees : o.fee});				
				let sender = await controller.getAddress(o.sender, processingBlock);
	                        let receiver = await controller.getAddress(o.receiver, processingBlock);
	                        await controller.addOrderToAddress (sender._id, newOrder);
				await controller.addOrderToAddress (receiver._id, newOrder);
			}else{
				console.log("Ods: ", o.fees, o.Fees, o);
	                        let response = await rpc.getOrderInfo(o.orderid);
        	                let orderData = response.result.order;
                	        let newOrder = await controller.createOrder({...orderData, fees: orderData.fees ? orderData.fees : orderData.fee});				
				let sender = await controller.getAddress(o.sender, processingBlock);
                                let receiver = await controller.getAddress(o.receiver, processingBlock);
                                await controller.addOrderToAddress (sender._id, newOrder);
                                await controller.addOrderToAddress (receiver._id, newOrder);
			if(orderData.fees === undefined && orderData.fee === undefined) console.log("missing fees: ", orderData.orderid, orderData.fees, orderData.Fees, orderData);
			}
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
                    result: `RPC returned the wrong block data, expecting: ${processingBlock} but got: ${blockData.result.block}`
                }
            }
        }
    }

    mongoose.disconnect(); // Release mongo connection until next cycle;
    const ttNextBlock = 600-Math.ceil(Date.now()/1000 % 600)+50;
    console.log("Scheduled next sync in ", ttNextBlock);
    setTimeout(resumeCycle, ttNextBlock*1000);
};


console.log("Preparing History Filler.... (60seg).");
setTimeout(resumeCycle, 60000);


