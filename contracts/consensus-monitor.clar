;; network-pulse-protocol
;; Consensus monitoring and network health tracking system
;; Distributed ledger pulse detection and performance metrics

;; Error definitions
(define-constant fail-unauthorized (err u100))
(define-constant fail-invalid-metric-type (err u101))
(define-constant fail-invalid-measurement (err u102))
(define-constant fail-record-missing (err u103))
(define-constant fail-timestamp-invalid (err u104))
(define-constant fail-timespan-invalid (err u105))

;; Metric type identifiers
(define-constant metric-id-consensus-latency u1)
(define-constant metric-id-block-propagation u2)
(define-constant metric-id-tx-validation-time u3)
(define-constant metric-id-mempool-size u4)
(define-constant metric-id-node-availability u5)
(define-constant metric-id-network-throughput u6)
(define-constant metric-id-staker-participation u7)
(define-constant metric-id-peer-connectivity u8)

;; Storage maps for metric recording
(define-map metrics-registry
  { observer: principal, observation-time: uint, metric-type: uint }
  { reading: uint, annotation: (optional (string-utf8 256)) }
)

(define-map timestamp-index
  { observer: principal, metric-type: uint }
  { latest: uint }
)

(define-map observation-counter
  { observer: principal, metric-type: uint }
  { total: uint }
)

;; Validation helper for metric type
(define-private (validate-metric-type (m-type uint))
  (or
    (is-eq m-type metric-id-consensus-latency)
    (is-eq m-type metric-id-block-propagation)
    (is-eq m-type metric-id-tx-validation-time)
    (is-eq m-type metric-id-mempool-size)
    (is-eq m-type metric-id-node-availability)
    (is-eq m-type metric-id-network-throughput)
    (is-eq m-type metric-id-staker-participation)
    (is-eq m-type metric-id-peer-connectivity)
  )
)

;; Range validation helper
(define-private (validate-measurement (m-type uint) (reading uint))
  (if (is-eq m-type metric-id-consensus-latency)
      (and (>= reading u100) (<= reading u5000)) ;; milliseconds
    (if (is-eq m-type metric-id-block-propagation)
        (and (>= reading u500) (<= reading u10000)) ;; milliseconds
      (if (is-eq m-type metric-id-tx-validation-time)
          (and (>= reading u10) (<= reading u1000)) ;; milliseconds
        (if (is-eq m-type metric-id-mempool-size)
            (and (>= reading u0) (<= reading u10000)) ;; transaction count
          (if (is-eq m-type metric-id-node-availability)
              (and (>= reading u0) (<= reading u100)) ;; percentage
            (if (is-eq m-type metric-id-network-throughput)
                (and (>= reading u0) (<= reading u100000)) ;; tx/sec
              (if (is-eq m-type metric-id-staker-participation)
                  (and (>= reading u0) (<= reading u100)) ;; percentage
                (if (is-eq m-type metric-id-peer-connectivity)
                    (and (>= reading u0) (<= reading u10000)) ;; peer count
                  false
                )
              )
            )
          )
        )
      )
    )
  )
)

;; Update timestamp tracking
(define-private (persist-timestamp (observer principal) (m-type uint) (obs-time uint))
  (map-set timestamp-index
    { observer: observer, metric-type: m-type }
    { latest: obs-time }
  )
)

;; Increment observation tally
(define-private (bump-observation-count (observer principal) (m-type uint))
  (let (
    (prev-total (default-to u0 (get total (map-get? observation-counter { observer: observer, metric-type: m-type }))))
  )
    (map-set observation-counter
      { observer: observer, metric-type: m-type }
      { total: (+ prev-total u1) }
    )
  )
)

;; Query a single metric observation
(define-read-only (fetch-observation (observer principal) (obs-time uint) (m-type uint))
  (map-get? metrics-registry { observer: observer, observation-time: obs-time, metric-type: m-type })
)

;; Retrieve latest reading for a metric
(define-read-only (fetch-latest-observation (observer principal) (m-type uint))
  (let (
    (latest-ts (get latest (default-to { latest: u0 }
                            (map-get? timestamp-index { observer: observer, metric-type: m-type }))))
  )
    (if (is-eq latest-ts u0)
        (ok none)
        (ok (map-get? metrics-registry { observer: observer, observation-time: latest-ts, metric-type: m-type }))
    )
  )
)

;; Query total observations count
(define-read-only (fetch-observation-count (observer principal) (m-type uint))
  (default-to { total: u0 } (map-get? observation-counter { observer: observer, metric-type: m-type }))
)

;; Validate metric type query
(define-read-only (query-metric-validity (m-type uint))
  (ok (validate-metric-type m-type))
)

;; Validate measurement range
(define-read-only (query-measurement-validity (m-type uint) (reading uint))
  (ok (validate-measurement m-type reading))
)

;; Record new network metric
(define-public (log-observation (m-type uint) (reading uint) (obs-time uint) (annotation (optional (string-utf8 256))))
  (let (
    (observer tx-sender)
    (block-timestamp (unwrap! (get-block-info? time (- block-height u1)) (err u500)))
  )
    ;; Validate inputs
    (asserts! (validate-metric-type m-type) fail-invalid-metric-type)
    (asserts! (validate-measurement m-type reading) fail-invalid-measurement)
    (asserts! (<= obs-time block-timestamp) fail-timestamp-invalid)

    ;; Persist observation
    (map-set metrics-registry
      { observer: observer, observation-time: obs-time, metric-type: m-type }
      { reading: reading, annotation: annotation }
    )

    ;; Update tracking
    (persist-timestamp observer m-type obs-time)
    (bump-observation-count observer m-type)

    (ok true)
  )
)

;; Modify an existing observation
(define-public (amend-observation (obs-time uint) (m-type uint) (reading uint) (annotation (optional (string-utf8 256))))
  (let (
    (observer tx-sender)
    (prior-entry (map-get? metrics-registry { observer: observer, observation-time: obs-time, metric-type: m-type }))
  )
    ;; Validate inputs and state
    (asserts! (validate-metric-type m-type) fail-invalid-metric-type)
    (asserts! (validate-measurement m-type reading) fail-invalid-measurement)
    (asserts! (is-some prior-entry) fail-record-missing)

    ;; Update record
    (map-set metrics-registry
      { observer: observer, observation-time: obs-time, metric-type: m-type }
      { reading: reading, annotation: annotation }
    )

    (ok true)
  )
)

;; Remove an observation
(define-public (purge-observation (obs-time uint) (m-type uint))
  (let (
    (observer tx-sender)
    (prior-entry (map-get? metrics-registry { observer: observer, observation-time: obs-time, metric-type: m-type }))
    (prev-total (get total (default-to { total: u0 } (map-get? observation-counter { observer: observer, metric-type: m-type }))))
  )
    ;; Validate state
    (asserts! (is-some prior-entry) fail-record-missing)

    ;; Delete record
    (map-delete metrics-registry { observer: observer, observation-time: obs-time, metric-type: m-type })

    ;; Update count
    (map-set observation-counter
      { observer: observer, metric-type: m-type }
      { total: (- prev-total u1) }
    )

    ;; Update latest if needed
    (let (
      (current-latest (get latest (default-to { latest: u0 }
                                   (map-get? timestamp-index { observer: observer, metric-type: m-type }))))
    )
      (if (is-eq obs-time current-latest)
          (map-delete timestamp-index { observer: observer, metric-type: m-type })
          true
      )
    )

    (ok true)
  )
)

;; Grant data visibility
(define-public (grant-observation-access (recipient principal) (m-type uint) (obs-time uint))
  (let (
    (observer tx-sender)
    (metric-data (map-get? metrics-registry { observer: observer, observation-time: obs-time, metric-type: m-type }))
  )
    (asserts! (is-some metric-data) fail-record-missing)

    ;; Return accessible metric information
    (ok metric-data)
  )
)
