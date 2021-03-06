import TransactionPool from "./TransactionPool";
import Transaction from "./Transaction";
import Wallet from ".";
import Blockchain from "../blockchain";

describe("TransactionPool", () => {
  let transactionPool: TransactionPool,
    transaction: Transaction,
    senderWallet: Wallet;

  beforeEach(() => {
    transactionPool = new TransactionPool();
    senderWallet = new Wallet();
    transaction = new Transaction({
      senderWallet,
      recipient: "fake-recipient",
      amount: 50,
    });
  });

  describe("setTransaction()", () => {
    it("should add a transaction", () => {
      transactionPool.setTransaction(transaction);

      expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
    });
  });

  describe("existingTransaction()", () => {
    it("should return an existing transaction given an input address", () => {
      transactionPool.setTransaction(transaction);

      expect(transactionPool.existingTransaction(senderWallet.publicKey)).toBe(
        transaction
      );
    });
  });

  describe("validTransactions()", () => {
    let validTransactions: Transaction[], errorMock: any;

    beforeEach(() => {
      validTransactions = [];
      errorMock = jest.fn();
      global.console.error = errorMock;

      for (let i = 0; i < 10; i++) {
        transaction = new Transaction({
          senderWallet,
          recipient: "any-recipient",
          amount: 30,
        });

        // randomize
        if (i % 3 === 0) {
          transaction.input.amount = 999999;
        } else if (i % 3 === 1) {
          transaction.input.signature = new Wallet().sign("foo");
        } else {
          validTransactions.push(transaction);
        }

        transactionPool.setTransaction(transaction);
      }
    });

    it("should return valid transactions", () => {
      expect(transactionPool.validTransactions()).toEqual(validTransactions);
    });

    it("should log errors for invalid transactions", () => {
      transactionPool.validTransactions();

      expect(errorMock).toHaveBeenCalled();
    });
  });

  describe("clear()", () => {
    it("should clear the transactions", () => {
      transactionPool.clear();

      expect(transactionPool.transactionMap).toEqual({});
    });
  });

  describe("clearBlockchainTransactions()", () => {
    it("should clear the pool of any existing blockchain transactions", () => {
      const blockchain = new Blockchain();
      const expectedTransactionMap: any = {};

      for (let i = 0; i < 6; i++) {
        const transaction = new Wallet().createTransaction({
          recipient: "john",
          amount: 20,
        });

        transactionPool.setTransaction(transaction);

        if (i % 2 === 0) {
          blockchain.addBlock([transaction]);
        } else {
          expectedTransactionMap[transaction.id] = transaction;
        }
      }

      transactionPool.clearBlockchainTransactions(blockchain.chain);
      expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
    });
  });
});
