const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Block = mongoose.model(
    "Block",
    new Schema({
        highest: Number
    })
)

const Address = mongoose.model(
    "Address",
    new Schema({
        address: String,
        createdAt: Number,
        txs: [{
            type: Schema.Types.ObjectId,
            ref: "Order"
        }]
    })
)

const Order = mongoose.model(
    "Order",
    new Schema({
        orderid: String,
        block: Number,
        timestamp: Number,
        amount: Number,
        fees: Number,
        reference: String,
        sender: String,
        receiver: String
    })
)


exports.Address = Address;
exports.Order = Order;
exports.Block = Block;
exports.db = mongoose;