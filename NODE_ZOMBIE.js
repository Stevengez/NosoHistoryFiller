const dotenv = require('dotenv');
dotenv.config();
const { exec } = require('child_process');
const rpc = require('./rpc');
const api = require('./api');

let failCheck = 0;

const killService = (isAPI) => {
    const serviceName = isAPI?"nosoapi.service":"noso.service";
    exec(`systemctl restart ${serviceName}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error al reiniciar el servicio ${serviceName}: ${error}`);
        return;
    }
    console.log(`El servicio ${serviceName} ha sido reiniciado`);
    });
}

const checkNodeVitality = async () => {
    let mnResult;
    try {
        mnResult = await rpc.getMainnetInfo();
    }catch(e){
        console.log("RPC connection failed, restarting service...");
        killService();
        console.log("Next Node Check in 2 minutes");
        return setTimeout(checkNodeVitality, 120000);
    }
    const mnCurrentBlock = mnResult.result;
    const currentApiBlock = await api.getConsensusLastBlock();

    console.log("# Verifying Node Delta");
    console.log("# Last Node Block: ", mnCurrentBlock.lastblock);
    console.log("# Last Consensus Block: ", currentApiBlock);
    console.log("");

    if(mnCurrentBlock < currentApiBlock){
        if(failCheck < 5){
            console.log("NODE is behind Consensus, rechecking in 1/2 minute");
            failCheck++;
            return setTimeout(checkNodeVitality, 30000);
        }else{
            failCheck = 0;
            /* Kill Process somehow */
            killService();
            
            let ttNextCheck = Math.ceil((600 - ((Date.now() / 1000) % 600))/2);
            if(ttNextCheck < 60){
                ttNextCheck+= 320-ttNextCheck;
            }

            console.log("Next Node Check in", ttNextCheck, "secs");
            setTimeout(checkNodeVitality, ttNextCheck*1000);
        }
    }else if(mnCurrentBlock > currentApiBlock){
	if(failCheck < 5){
            console.log("API is behind node, rechecking in 1/2 minute");
            failCheck++;
            return setTimeout(checkNodeVitality, 30000);
        }else{
            failCheck = 0;
            /* Kill Process somehow */
            killService(true);

            let ttNextCheck = Math.ceil((600 - ((Date.now() / 1000) % 600))/2);
            if(ttNextCheck < 60){
                ttNextCheck+= 320-ttNextCheck;
            }

            console.log("Next Node Check in", ttNextCheck, "secs");
            setTimeout(checkNodeVitality, ttNextCheck*1000);
        }
    }else{
        /** check last block validity **/
        let response = await rpc.getBlockInfo(currentApiBlock);
        if(response.result.valid === true && response.result.block === currentApiBlock){
            console.log("RPC node seems healthy, reprogramming...");
            let ttNextBlock = 600 - Math.ceil((Date.now() / 1000) % 600);
            let ttNextCheck = ttNextBlock+60;
            console.log("Next Node Check in", ttNextCheck, "secs");
            setTimeout(checkNodeVitality, ttNextCheck*1000);
        }else{

            let currentBlockTime = Math.ceil((Date.now() / 1000) % 600);

            if(currentBlockTime > 60){
                console.log("Current Block Time: ", currentBlockTime);
                console.log("Node is unhealthy, restarting... ");
                killService();    
                console.log("Next Node Check in 2 minutes");
                setTimeout(checkNodeVitality, 120000);
            }else{
                let ttNextCheck = 60 - currentBlockTime;
                console.log("Node seems unhealthy, double check in: ", ttNextCheck);
                setTimeout(checkNodeVitality, ttNextCheck*1000);
            }
        }
    }
}

console.log("Waiting 1 minute before start health check...");
setTimeout(checkNodeVitality, 60000);
