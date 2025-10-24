# Network Pulse Protocol

A distributed ledger monitoring framework built with Clarity smart contracts, enabling real-time network health metrics collection and consensus performance tracking across the Stacks blockchain.

## What is Network Pulse Protocol?

Network Pulse Protocol provides a decentralized infrastructure for observing and recording network performance indicators. Nodes and network participants can submit telemetry data about their network operations, which is permanently recorded and available for historical analysis.

The protocol tracks eight core performance metrics:
- **Consensus Latency**: Time required to reach block consensus
- **Block Propagation**: Duration for block dissemination across the network
- **Transaction Validation**: Time spent validating transactions in the pipeline
- **Mempool Metrics**: Current size and composition of pending transactions
- **Node Availability**: Uptime and operational status of network nodes
- **Network Throughput**: Transactions processed per second
- **Staker Participation**: Validator engagement and contribution rates
- **Peer Connectivity**: Number of active peer connections in the network

## Architecture Overview

### Core Components

The protocol implements three primary layers:

**Measurement Layer** - Captures raw network metrics with associated timestamps and optional annotations. Each observation is immutable once recorded.

**Indexing Layer** - Maintains temporal indices for rapid lookups of latest measurements and cumulative observation counts per node and metric type.

**Access Layer** - Provides read-only querying mechanisms and data sharing capabilities with optional recipient access grants.

### Smart Contract Design

The `consensus-monitor` contract manages all protocol operations:

- `log-observation`: Records new metric observations with full validation
- `amend-observation`: Modifies existing observations (owner-only)
- `purge-observation`: Removes observations and updates counts
- `grant-observation-access`: Shares metric data with other principals
- `fetch-observation`: Retrieves specific metric at given timestamp
- `fetch-latest-observation`: Gets most recent reading for a metric type
- `fetch-observation-count`: Returns total observations recorded

### Data Validation

Strict validation ensures network metrics remain meaningful:

| Metric | Min Value | Max Value | Unit |
|--------|-----------|-----------|------|
| Consensus Latency | 100 | 5000 | ms |
| Block Propagation | 500 | 10000 | ms |
| TX Validation Time | 10 | 1000 | ms |
| Mempool Size | 0 | 10000 | count |
| Node Availability | 0 | 100 | % |
| Network Throughput | 0 | 100000 | tx/s |
| Staker Participation | 0 | 100 | % |
| Peer Connectivity | 0 | 10000 | count |

## Quick Start

### Installation

Clone the repository and initialize with Clarinet:

```bash
git clone https://github.com/yourusername/network-pulse-protocol.git
cd network-pulse-protocol
clarinet install
```

### Recording a Metric

Submit a consensus latency observation:

```clarity
(contract-call? .consensus-monitor 
  log-observation
  u1                          ;; metric-id-consensus-latency
  u1250                       ;; reading: 1250ms
  block-height                ;; observation timestamp
  (some "Primary validator")  ;; optional annotation
)
```

### Querying Metrics

Retrieve the latest block propagation metric:

```clarity
(contract-call? .consensus-monitor
  fetch-latest-observation
  tx-sender
  u2  ;; metric-id-block-propagation
)
```

Get total observations for throughput metrics:

```clarity
(contract-call? .consensus-monitor
  fetch-observation-count
  tx-sender
  u6  ;; metric-id-network-throughput
)
```

### Sharing Data

Grant another principal access to your observations:

```clarity
(contract-call? .consensus-monitor
  grant-observation-access
  'SPVVN9YHBY64V7DCPX4H6Z02YST8K3DZQW7HNRJ5
  u1
  u12345
)
```

## Security Model

The protocol implements several security safeguards:

1. **Caller Authentication** - All modifications are sender-authenticated via tx-sender
2. **Temporal Validation** - Observations cannot have timestamps in the future
3. **Range Validation** - Each metric type enforces reasonable value boundaries
4. **Immutability** - Historical observations cannot be deleted arbitrarily
5. **Access Control** - Data sharing is explicit and granular per observation

## Performance Characteristics

- **Storage**: O(1) observation recording and retrieval
- **Metadata Updates**: O(1) index and count updates  
- **Query Time**: O(1) for any single observation lookup
- **Memory**: Linear with total observation count

## Use Cases

**Network Monitoring Dashboards** - Real-time visualization of network health indicators

**Validator Performance Tracking** - Monitor individual node contribution metrics

**Protocol Optimization** - Historical analysis to identify bottlenecks and improvement areas

**SLA Compliance** - Verify network performance against agreed service levels

**Research & Analytics** - Academic analysis of blockchain network behavior patterns

## Development

Run tests:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:report
```

## License

MIT License - See LICENSE file for details

## Support & Community

- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Engage with community at [Discord server]
- **Documentation**: Full API reference at [docs.networkpulse.dev]

---

Built with Clarity on Stacks blockchain infrastructure.
