# Escalation Matrix

## Risk Dimensions

Classify each as Low / Medium / High:

- Blast Radius: how many systems/files/users are affected.
- Reversibility: ease of rollback.
- Data Sensitivity: user data, secrets, compliance exposure.
- User Impact: chance of visible regression.
- External Cost: paid APIs, cloud spend, vendor actions.

## Escalation Rule

- If any dimension is `High`, escalate to user.
- If three or more dimensions are `Medium`, escalate to user.
- Otherwise, auto-decide and proceed.

## Mandatory Escalation Cases

- Destructive filesystem or data operations.
- Git history rewrite or force operations.
- Security policy or secret handling changes.
- Legal/compliance interpretation decisions.
- Unbounded or uncertain external spend.
