# Mock Scenarios

These sanitized mock states represent the main UX situations the product should handle well.

## `default`

- linked accounts: 3
- transactions: present
- data quality: mostly healthy, one institution needs reconnect
- user feeling: “I have enough information to act, but accuracy is slightly reduced”

## `empty`

- linked accounts: 0
- transactions: none
- data quality: no connected financial data
- user feeling: “I need help understanding value before I connect anything”

## `linked_no_transactions`

- linked accounts: 3
- transactions: none
- data quality: accounts connected, but trend/insight surfaces have low evidence
- user feeling: “I connected data but still don’t see enough useful context”

## `partial_facts`

- linked accounts: 1 savings account
- transactions: none
- data quality: partial information only
- user feeling: “The app knows something, but not enough to feel fully tailored”

## `crisis_cash_flow`

- linked accounts: 3
- transactions: present
- data quality: enough data to identify negative cash-flow pressure
- user feeling: “I need clear prioritization and confidence under stress”
