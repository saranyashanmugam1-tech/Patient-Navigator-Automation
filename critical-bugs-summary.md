# Critical Bugs — Cross-Project Summary

Consolidated from the two QA reports run against `rpa.icarebuddy.com`:
- **OrderStatus** app (23 test cases, 2026-09-17)
- **GetRx** prescription app (14 test cases, 2026-09-18)

Only **Critical**-severity findings are listed below. Full context, repro steps, and lower-severity findings remain in each project's own report.

---

## OrderStatus app

### 1. Payment completion trusts a client-controlled redirect URL (TC-23)
After MFA, the browser is redirected to:
```
GET /Payment/Complete?...&ApprovedAmount=80.00&OrderIds=11408602&StatusMessage=Success&...
```
Every field describing the payment outcome — order ID, amount, status, transaction ID — travels as a plain GET query string, and the order is marked paid based on it. A clearly fake, non-Luhn-valid card number (`3434 343434 34343`) was "approved" and produced a full payment receipt.

**Why it's critical:** if the backend trusts this redirect instead of independently verifying the charge with the card processor server-to-server, anyone who can construct this URL shape (arbitrary `OrderIds`, `ApprovedAmount`, `StatusMessage=Success`) could mark any order as paid — no real card, no gateway, possibly no MFA needed if the URL is guessable.

### 2. Pay flow marks orders "paid" with no card ever collected, on some orders (TC-21)
On two separate orders (11408579, 11408568), completing MFA alone was enough to reach "Payment received successfully" — no card form was ever shown, and no payment-gateway network call occurred at all. Reproduced identically on both.

**Why it's critical:** this is very likely explained by finding #1 above — if payment status isn't independently verified, an order can be marked paid without any money changing hands. (A third order, 11408602, did show a real card form — the bug is order-dependent, not universal — see TC-22 in the full report for the related PCI-compliance issue found there.)

---

## GetRx prescription app

### 3. Unsanitized input crashes the backend with a 500 (SQLi-shaped weakness) (TC-07)
Submitting `<script>alert(1)</script>` as First Name and `' OR '1'='1` as Last Name (with a valid phone/DOB) caused:
```
GET /Home/CheckCustomerExists?FirstName=<script>alert(1)</script>&LastName=' OR '1'='1&... → HTTP 500
```
The client then threw a raw `alert("[object Object]")` instead of a clean error message.

**Why it's critical:** a bare single quote breaking the backend is the classic signature of a SQL injection surface. No stack trace leaked (good), but this needs urgent server-side investigation — add input validation and confirm parameterized queries are used.

### 4. Patient PII — full name + phone + date of birth — sent via plaintext GET query string (TC-08)
Every search (valid or not) hits:
```
GET /Home/CheckCustomerExists?FirstName=...&LastName=...&PhoneNumber=...&DateOfBirth=...
```

**Why it's critical:** this is enough data to fully re-identify a patient, sitting in a URL that gets logged by servers, proxies, and browser history, and can leak via Referer headers. This is worse than the equivalent OrderStatus issue (phone number only) because DOB is included.

### 5. Hardcoded secret key exposed in client-side page source (TC-09)
The page's inline `<script>` declares:
```js
const resultKey = "Optipasskey1234@";
```
in plain text, visible to anyone who views source.

**Why it's critical:** whatever this key is meant to protect (its name suggests a result-verification or decryption key, likely tied to the vendor "Optirise" seen in error-page support contact `support@optirise.in`), it provides zero real protection once shipped to the browser. Rotate it and move the logic that depends on it server-side.

---

## Bottom line

| # | App | Finding | Root-cause link |
|---|---|---|---|
| 1 | OrderStatus | Payment confirmed via trusted client redirect | Root cause of #2 |
| 2 | OrderStatus | Orders marked paid with no card collected (2 of 3 tested) | Downstream of #1 |
| 3 | GetRx | Unsanitized input → server 500 (SQLi-shaped) | Independent |
| 4 | GetRx | Full patient PII (name+phone+DOB) in GET URLs | Independent |
| 5 | GetRx | Hardcoded secret key in page source | Independent |

Recommend prioritizing **#1/#2 (payment integrity)** and **#3 (potential SQL injection)** first — both are actively exploitable-shaped issues, not just hygiene problems.
