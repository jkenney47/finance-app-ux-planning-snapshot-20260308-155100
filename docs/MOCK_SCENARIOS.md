# Mock Scenarios

These sanitized mock states represent the main roadmap-coverage situations the product should handle well.

## `none`

- linked institutions: 0
- linked accounts: 0
- data quality: no connected financial data
- user feeling: "I can preview the product, but not get the personalized roadmap yet"

## `core_transactional`

- linked institutions: 1
- linked accounts: 1
- connected categories: checking / savings
- data quality: enough to understand current cash flow, but broader tradeoffs are still limited
- user feeling: "I have a believable first plan, but it is still narrow"

## `core_plus_debt`

- linked institutions: 2
- linked accounts: 2
- connected categories: checking / savings, credit cards
- data quality: enough for cash-flow and near-term debt prioritization
- user feeling: "The app can now explain why one tradeoff beats another"

## `full_coverage`

- linked institutions: 4
- linked accounts: 5
- connected categories: checking / savings, credit cards, loans, retirement / investments
- data quality: the strongest mock path with cash-flow, debt, savings, and longer-term context
- user feeling: "The roadmap feels meaningfully personalized and more defensible"
