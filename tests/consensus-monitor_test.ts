import { describe, it, expect, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "@hirosystems/clarinet-sdk";

describe("consensus-monitor contract tests", () => {
  let chain: Chain;
  let accounts: Map<string, Account>;
  let deployer: Account;
  let observer1: Account;
  let observer2: Account;
  let recipient: Account;

  beforeEach(async () => {
    const ctx = new Clarinet();
    chain = ctx.chain;
    accounts = ctx.accounts;

    deployer = accounts.get("deployer")!;
    observer1 = accounts.get("wallet_1")!;
    observer2 = accounts.get("wallet_2")!;
    recipient = accounts.get("wallet_3")!;
  });

  describe("Metric Type Validation", () => {
    it("should validate consensus-latency metric type", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-metric-validity",
        [Clarinet.uint(1)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should validate block-propagation metric type", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-metric-validity",
        [Clarinet.uint(2)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should reject invalid metric type", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-metric-validity",
        [Clarinet.uint(99)],
        deployer.address
      );
      expect(result.result).toContain("false");
    });

    it("should validate network-throughput metric type", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-metric-validity",
        [Clarinet.uint(6)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should validate all eight metric types", () => {
      for (let i = 1; i <= 8; i++) {
        const result = chain.callReadOnlyFn(
          "consensus-monitor",
          "query-metric-validity",
          [Clarinet.uint(i)],
          deployer.address
        );
        expect(result.result).toContain("true");
      }
    });
  });

  describe("Measurement Value Validation", () => {
    it("should accept valid consensus latency within range", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(1), Clarinet.uint(2500)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should reject consensus latency below minimum", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(1), Clarinet.uint(50)],
        deployer.address
      );
      expect(result.result).toContain("false");
    });

    it("should reject consensus latency above maximum", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(1), Clarinet.uint(6000)],
        deployer.address
      );
      expect(result.result).toContain("false");
    });

    it("should accept valid block propagation values", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(2), Clarinet.uint(5000)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should validate node availability percentage bounds", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(5), Clarinet.uint(99)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should reject invalid node availability over 100%", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(5), Clarinet.uint(101)],
        deployer.address
      );
      expect(result.result).toContain("false");
    });

    it("should accept mempool size values", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(4), Clarinet.uint(5000)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });

    it("should validate staker participation values", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "query-measurement-validity",
        [Clarinet.uint(7), Clarinet.uint(75)],
        deployer.address
      );
      expect(result.result).toContain("true");
    });
  });

  describe("Observation Recording", () => {
    it("should successfully record a new consensus latency observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1200),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("true");
    });

    it("should record observation with optional annotation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(2),
          Clarinet.uint(3000),
          Clarinet.uint(200),
          Clarinet.some(Clarinet.utf8("Primary node measurement")),
        ],
        observer1.address
      );
      expect(response.result).toContain("true");
    });

    it("should reject observation with invalid metric type", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(99),
          Clarinet.uint(1500),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u101");
    });

    it("should reject observation with out-of-range value", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(50),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u102");
    });

    it("should reject future-dated observations", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(2000),
          Clarinet.uint(999999999),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u104");
    });

    it("should record multiple observations from same observer", () => {
      const response1 = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1100),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      const response2 = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(2),
          Clarinet.uint(3200),
          Clarinet.uint(150),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response1.result).toContain("true");
      expect(response2.result).toContain("true");
    });

    it("should record observations from different observers", () => {
      const response1 = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(3),
          Clarinet.uint(500),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      const response2 = chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(3),
          Clarinet.uint(450),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer2.address
      );
      expect(response1.result).toContain("true");
      expect(response2.result).toContain("true");
    });
  });

  describe("Observation Retrieval", () => {
    beforeEach(() => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1500),
          Clarinet.uint(100),
          Clarinet.some(Clarinet.utf8("test-annotation")),
        ],
        observer1.address
      );
    });

    it("should retrieve a specific observation by timestamp and metric", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation",
        [
          Clarinet.principal(observer1.address),
          Clarinet.uint(100),
          Clarinet.uint(1),
        ],
        deployer.address
      );
      expect(result.result).toContain("reading");
      expect(result.result).toContain("1500");
    });

    it("should return none for non-existent observation", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation",
        [
          Clarinet.principal(observer1.address),
          Clarinet.uint(999),
          Clarinet.uint(1),
        ],
        deployer.address
      );
      expect(result.result).toContain("none");
    });

    it("should retrieve latest observation for a metric", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-latest-observation",
        [Clarinet.principal(observer1.address), Clarinet.uint(1)],
        deployer.address
      );
      expect(result.result).toContain("reading");
      expect(result.result).toContain("1500");
    });

    it("should return empty for metrics with no observations", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-latest-observation",
        [Clarinet.principal(observer2.address), Clarinet.uint(6)],
        deployer.address
      );
      expect(result.result).toContain("none");
    });
  });

  describe("Observation Count Tracking", () => {
    it("should return zero for observer with no observations", () => {
      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(1)],
        deployer.address
      );
      expect(result.result).toContain("total");
      expect(result.result).toContain("0");
    });

    it("should increment count after recording observation", () => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1300),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );

      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(1)],
        deployer.address
      );
      expect(result.result).toContain("1");
    });

    it("should track counts per metric type separately", () => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1200),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(2),
          Clarinet.uint(4000),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );

      const count1 = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(1)],
        deployer.address
      );
      const count2 = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(2)],
        deployer.address
      );

      expect(count1.result).toContain("1");
      expect(count2.result).toContain("1");
    });

    it("should handle multiple observations of same metric", () => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(4),
          Clarinet.uint(100),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(4),
          Clarinet.uint(150),
          Clarinet.uint(200),
          Clarinet.none(),
        ],
        observer1.address
      );
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(4),
          Clarinet.uint(200),
          Clarinet.uint(300),
          Clarinet.none(),
        ],
        observer1.address
      );

      const result = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(4)],
        deployer.address
      );
      expect(result.result).toContain("3");
    });
  });

  describe("Observation Modification", () => {
    beforeEach(() => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(1),
          Clarinet.uint(1400),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
    });

    it("should successfully amend an existing observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "amend-observation",
        [
          Clarinet.uint(100),
          Clarinet.uint(1),
          Clarinet.uint(1600),
          Clarinet.some(Clarinet.utf8("corrected measurement")),
        ],
        observer1.address
      );
      expect(response.result).toContain("true");
    });

    it("should fail when amending non-existent observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "amend-observation",
        [
          Clarinet.uint(999),
          Clarinet.uint(1),
          Clarinet.uint(1600),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u103");
    });

    it("should reject amendment with invalid metric type", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "amend-observation",
        [
          Clarinet.uint(100),
          Clarinet.uint(99),
          Clarinet.uint(1600),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u101");
    });

    it("should reject amendment with out-of-range value", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "amend-observation",
        [
          Clarinet.uint(100),
          Clarinet.uint(1),
          Clarinet.uint(10000),
          Clarinet.none(),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u102");
    });

    it("should allow updating annotation only", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "amend-observation",
        [
          Clarinet.uint(100),
          Clarinet.uint(1),
          Clarinet.uint(1400),
          Clarinet.some(Clarinet.utf8("Updated note")),
        ],
        observer1.address
      );
      expect(response.result).toContain("true");
    });
  });

  describe("Observation Deletion", () => {
    beforeEach(() => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(2),
          Clarinet.uint(6000),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );
    });

    it("should successfully delete an observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "purge-observation",
        [Clarinet.uint(100), Clarinet.uint(2)],
        observer1.address
      );
      expect(response.result).toContain("true");
    });

    it("should fail when deleting non-existent observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "purge-observation",
        [Clarinet.uint(999), Clarinet.uint(2)],
        observer1.address
      );
      expect(response.result).toContain("err u103");
    });

    it("should decrement count after deletion", () => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(3),
          Clarinet.uint(300),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );

      const countBefore = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(3)],
        deployer.address
      );

      chain.callPublicFn(
        "consensus-monitor",
        "purge-observation",
        [Clarinet.uint(100), Clarinet.uint(3)],
        observer1.address
      );

      const countAfter = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(3)],
        deployer.address
      );

      expect(countBefore.result).toContain("1");
      expect(countAfter.result).toContain("0");
    });

    it("should handle latest timestamp cleanup on deletion", () => {
      const deleteResponse = chain.callPublicFn(
        "consensus-monitor",
        "purge-observation",
        [Clarinet.uint(100), Clarinet.uint(2)],
        observer1.address
      );
      expect(deleteResponse.result).toContain("true");
    });
  });

  describe("Data Access Sharing", () => {
    beforeEach(() => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(5),
          Clarinet.uint(98),
          Clarinet.uint(100),
          Clarinet.some(Clarinet.utf8("availability-data")),
        ],
        observer1.address
      );
    });

    it("should grant access to observation data", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "grant-observation-access",
        [
          Clarinet.principal(recipient.address),
          Clarinet.uint(5),
          Clarinet.uint(100),
        ],
        observer1.address
      );
      expect(response.result).toContain("reading");
      expect(response.result).toContain("98");
    });

    it("should fail when sharing non-existent observation", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "grant-observation-access",
        [
          Clarinet.principal(recipient.address),
          Clarinet.uint(5),
          Clarinet.uint(999),
        ],
        observer1.address
      );
      expect(response.result).toContain("err u103");
    });

    it("should allow owner to share their data", () => {
      const response = chain.callPublicFn(
        "consensus-monitor",
        "grant-observation-access",
        [
          Clarinet.principal(observer2.address),
          Clarinet.uint(5),
          Clarinet.uint(100),
        ],
        observer1.address
      );
      expect(response.result).toContain("ok");
    });
  });

  describe("Edge Cases & Boundary Conditions", () => {
    it("should handle minimum valid values for each metric", () => {
      const minValues = [u100, u500, u10, u0, u0, u0, u0, u0];

      for (let i = 1; i <= 8; i++) {
        const response = chain.callPublicFn(
          "consensus-monitor",
          "log-observation",
          [
            Clarinet.uint(i),
            Clarinet.uint(minValues[i - 1]),
            Clarinet.uint(100 + i),
            Clarinet.none(),
          ],
          observer1.address
        );
        expect(response.result).toContain("true");
      }
    });

    it("should handle maximum valid values for each metric", () => {
      const maxValues = [u5000, u10000, u1000, u10000, u100, u100000, u100, u10000];

      for (let i = 1; i <= 8; i++) {
        const response = chain.callPublicFn(
          "consensus-monitor",
          "log-observation",
          [
            Clarinet.uint(i),
            Clarinet.uint(maxValues[i - 1]),
            Clarinet.uint(200 + i),
            Clarinet.none(),
          ],
          observer2.address
        );
        expect(response.result).toContain("true");
      }
    });

    it("should maintain independence of observations by observer", () => {
      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(6),
          Clarinet.uint(50000),
          Clarinet.uint(100),
          Clarinet.none(),
        ],
        observer1.address
      );

      chain.callPublicFn(
        "consensus-monitor",
        "log-observation",
        [
          Clarinet.uint(6),
          Clarinet.uint(75000),
          Clarinet.uint(150),
          Clarinet.none(),
        ],
        observer2.address
      );

      const count1 = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer1.address), Clarinet.uint(6)],
        deployer.address
      );

      const count2 = chain.callReadOnlyFn(
        "consensus-monitor",
        "fetch-observation-count",
        [Clarinet.principal(observer2.address), Clarinet.uint(6)],
        deployer.address
      );

      expect(count1.result).toContain("1");
      expect(count2.result).toContain("1");
    });
  });
});
