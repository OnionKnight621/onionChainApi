import Block from "./Block";
import cryptoHash from "../utils/cryptoHash";
import { REWARD_INPUT, MINING_REWARD } from "../../config";
import Transaction from "../wallet/Transaction";
import Wallet from "../wallet";

export default class Blockchain {
  chain: Block[];

  constructor() {
    this.chain = [Block.genesis()];
  }

  addBlock(data: any) {
    const lastBlock = this.chain[this.chain.length - 1];

    const newBlock = Block.mineBlock(lastBlock, data);

    this.chain.push(newBlock);
  }

  replaceChain(
    chain: Block[],
    validateTransactions: boolean = false,
    onSuccess: any = false
  ) {
    if (chain.length <= this.chain.length) {
      console.error("Incoming chain must be longer");
      return;
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error("Incoming chain must be valid");
      return;
    }

    if (validateTransactions && !this.validTransactionData(chain)) {
      console.error("Incoming chain has invalid transaction data");
      return;
    }

    if (onSuccess) onSuccess();

    console.log("Replacing chain with", chain);
    this.chain = chain;
  }

  validTransactionData(chain: Block[]) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let transaction of block.data) {
        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount++;

          if (rewardTransactionCount > 1) {
            console.error("Miner rewards exceedd limit");
            return false;
          }

          if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
            console.error("Miner reward amount is invalid");
            return false;
          }
        } else {
          if (!Transaction.validateTransaction(transaction)) {
            console.error("Invalid transaction");
            return false;
          }

          const trueBalance = Wallet.calculateBalance(
            this.chain,
            transaction.input.address
          );

          if (transaction.input.amount !== trueBalance) {
            console.error("Invalid input amount");
            return false;
          }

          if (transactionSet.has(transaction)) {
            console.error("An identical transaction appeared");
            return false;
          } else {
            transactionSet.add(transaction);
          }
        }
      }
    }

    return true;
  }

  static isValidChain(chain: Block[]) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
      return false;

    for (let i = 1; i < chain.length; i++) {
      const { timestamp, lastHash, hash, data, nonce, difficulty } = chain[i];
      const actualLastHash = chain[i - 1].hash;
      const lastDifficulty = chain[i - 1].difficulty;

      if (lastHash !== actualLastHash) return false;

      const validatedHash = cryptoHash(
        timestamp,
        lastHash,
        data,
        nonce,
        difficulty
      );

      if (hash !== validatedHash) return false;
      if (Math.abs(lastDifficulty - difficulty) > 1) return false;
    }

    return true;
  }
}
