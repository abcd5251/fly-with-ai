# Fly With AI

Hedera x402 AI Travel Agent

One-line Pitch

An autonomous AI travel agent that pays for flight data with Hedera x402, finds the best deal, and only asks the user to sign when it's time to book.

1. 完整產品流程

User sets travel preferences
        ↓
AI Travel Agent
        ↓
Automatically monitors flight prices
        ↓
Flight API requires payment
        ↓
HTTP 402 Payment Required
        ↓
Agent pays 0.01 HBAR via x402
        ↓
Blocky402 Facilitator
        ↓
Hedera Testnet
        ↓
Flight data unlocked
        ↓
AI analyzes flight options
        ↓
Match found!
        ↓
Send Email to User
        ↓
User clicks "Confirm & Book"
        ↓
User signs final transaction
        ↓
Booking Confirmed

2. User Experience

Step 1 — User Creates a Travel Request

Frontend只需要一個非常簡單的表單。

Find My Trip

From
Taipei

To
Tokyo

Departure
Oct 20, 2026

Return
Oct 25, 2026

Max Budget
$500

[ Start Monitoring ]

按下：

Start Monitoring

之後使用者基本上就不需要一直留在網站。

3. AI Agent 開始工作

畫面顯示：

🤖 AI Travel Agent

Monitoring your trip...

Destination
Taipei → Tokyo

Budget
Under $500

Status
🟢 Monitoring

下面可以有 Agent Activity：

✓ Travel preferences saved
✓ Flight monitoring started
✓ Connected to Flight Data API

這時可以在 Demo 畫面展示：

"The user doesn't need to manually search for flights anymore. The AI Agent continuously monitors the market."

4. Agent 發現 Flight API 需要付款

這是整個 Hackathon 最重要的技術展示。

Agent 嘗試：

POST /api/flights/search

Flight API 回傳：

402 Payment Required

畫面顯示：

⚡ Paid API Detected

Flight Data API

HTTP 402 Payment Required

Price
0.01 HBAR

Network
Hedera Testnet

Facilitator
Blocky402

然後 Agent 自動處理：

Creating payment...
      ↓
Signing HBAR transaction...
      ↓
Blocky402 Facilitator
      ↓
Hedera Network
      ↓
✓ Payment Confirmed

5. Agent 取得航班資料

付款完成後：

✓ Payment verified

Requesting flight data...

然後：

200 OK

12 flight options received

AI Agent 自動分析：

Analyzing:

Price
Departure time
Duration
Stops
Airline
User preferences

最後找到：

✨ MATCH FOUND

ANA

Taipei → Tokyo

Oct 20
10:20 → 14:25

Direct

$428

Budget
$500 ✓

6. 發送 Email 給使用者

這裡就是你的產品最有意思的地方。

不要要求使用者一直盯著網站。

AI Agent 找到符合條件的航班後，自動寄 Email。

Email：

✈️ We found a flight for you!

Your AI Travel Agent found a flight
matching your preferences.

Taipei → Tokyo

ANA
Oct 20 – Oct 25

Direct flight

$428

✓ Within your budget
✓ Direct flight
✓ Matches your preferences

[ Confirm & Book ]

最重要的 CTA：

Confirm & Book

7. 使用者點擊 Email Button

使用者點擊：

Confirm & Book

進入一個非常簡單的 Booking Confirmation Page。

畫面：

✈️ Flight Found

ANA

Taipei → Tokyo

Oct 20 – Oct 25

Direct

Total
$428

下面：

Your AI Agent already found
and evaluated this flight.

All you need to do is sign
to confirm your booking.

按鈕：

Confirm & Sign

8. 最終使用者簽署

這裡才需要使用者介入。

例如：

Confirm Booking

ANA
Taipei → Tokyo

Total
$428

Payment Network
Hedera

[ Sign & Pay ]

如果有 HashPack：

HashPack

Confirm Transaction

Amount
XXX HBAR

To
Travel Booking Service

Network
Hedera Testnet

[ Confirm ]

如果 Hackathon Demo 時不方便接真錢包：

使用 Demo Wallet Mode。

但 UI 必須明確標示：

DEMO MODE

9. 最終完成

簽署成功：

🎉 Booking Confirmed

Your trip is booked!

✈️ ANA
Taipei → Tokyo

Oct 20 – Oct 25

$428

Payment
✓ Confirmed

Hedera
✓ Transaction Confirmed

下面顯示：

AI Agent Journey

✓ Monitored flights
✓ Paid for flight data
✓ Found matching flight
✓ Sent notification
✓ User approved booking
✓ Payment completed

10. 最重要的 Demo Timeline

整個 3 分鐘 Demo 只需要展示這 6 個階段：

01
USER SETS PREFERENCES
        ↓
02
AI AGENT MONITORS
        ↓
03
402 → x402 PAYMENT
        ↓
04
AI FINDS MATCH
        ↓
05
EMAIL NOTIFICATION
        ↓
06
USER SIGN → BOOKED

11. Demo 時的操作

實際 Demo 最好只需要操作 3 次。

操作 1

輸入：

Taipei → Tokyo
Budget: $500

按：

Start Monitoring

操作 2

系統自動跑：

Agent searching
↓
402 Payment Required
↓
0.01 HBAR
↓
Blocky402
↓
Hedera
↓
Flight data
↓
AI Match

這一段全部自動。

操作 3

Email 出現：

✈️ We found a match!
ANA — $428

[ Confirm & Book ]

點：

Confirm & Book

然後：

Sign & Pay

完成。

12. Hackathon 最重要的技術展示

Demo 不要花太多時間講旅遊。

真正要強調：

Traditional API

API Key
+
Subscription
+
Manual Billing

vs.

Hedera x402

AI Agent
   ↓
API Request
   ↓
402 Payment Required
   ↓
0.01 HBAR
   ↓
Hedera
   ↓
API Data

然後：

AI finds opportunity
        ↓
User gets Email
        ↓
One-click approval
        ↓
Final payment

13. 前端頁面只需要 3 個

Page 1 — Agent Dashboard

用途：

讓使用者設定旅遊條件。

TravelPay AI

Where?
Taipei → Tokyo

Budget
$500

[ Start Monitoring ]

────────────────────

AI Agent Status

🟢 Monitoring

Last checked
2 min ago

Page 2 — Agent Activity

這頁主要給 Hackathon 評審看。

AI Agent Activity

✓ Monitoring started

✓ Calling Flight Data API

⚠ HTTP 402 Payment Required

⚡ Paying 0.01 HBAR

✓ Blocky402 Payment Verified

✓ Hedera Transaction Confirmed

✓ Flight data received

✨ Matching flight found

這頁是技術 Demo 核心頁面。

Page 3 — Booking Confirmation

Email 點擊後進來。

Your AI Agent found a match ✨

ANA

Taipei → Tokyo

Oct 20 – Oct 25

$428

Direct Flight

────────────────

[ Confirm & Sign ]


簽署後：

🎉 BOOKING CONFIRMED

14. Email 是產品的重要一環

不要把 Email 做成普通通知。

讓它看起來像：

Your AI Travel Agent Found a Match ✈️

Hi!

Your AI Travel Agent found a flight
matching your requirements.

Taipei → Tokyo

ANA
Direct
$428

Your budget
$500

You save
$72

────────────────

Everything has already been
analyzed by your AI Agent.

You only need to approve
the final purchase.

[ Confirm & Book ]

────────────────

Powered by
Hedera x402

這會比單純「找到航班」更有產品感。

15. Demo Mode

一定要做：

DEMO_MODE=true

Demo 時：

Start Monitoring

可以讓系統自動模擬：

0 sec
Monitoring started

10 sec
API request

15 sec
402 Payment Required

20 sec
x402 Payment

25 sec
Hedera Payment Confirmed

30 sec
Flight Match Found

35 sec
Email Sent

這樣現場 Demo 不需要真的等待數小時。

16. 最重要的架構

                 USER
                  │
                  │ Travel Preferences
                  ▼
          ┌─────────────────┐
          │   AI TRAVEL     │
          │     AGENT       │
          └────────┬────────┘
                   │
                   │ API Request
                   ▼
          ┌─────────────────┐
          │  FLIGHT DATA    │
          │      API        │
          └────────┬────────┘
                   │
                   │ 402
                   ▼
          ┌─────────────────┐
          │   x402 PAYMENT  │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │    BLOCKY402    │
          │   FACILITATOR   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ HEDERA TESTNET  │
          └────────┬────────┘
                   │
                   │ Payment Verified
                   ▼
          ┌─────────────────┐
          │  FLIGHT DATA    │
          └────────┬────────┘
                   │
                   ▼
              AI MATCH
                   │
                   ▼
              EMAIL
                   │
                   │ Confirm & Book
                   ▼
                 USER
                   │
                   │ Sign
                   ▼
          ┌─────────────────┐
          │ FINAL PAYMENT   │
          └────────┬────────┘
                   ▼
             BOOKING ✓

17. 這個 Demo 的核心故事

Demo 開場只要講：

"Instead of searching for flights manually, I tell my AI Agent what I want."

設定：

Taipei → Tokyo, under $500.

然後：

"The Agent continuously searches paid flight APIs. When the API returns HTTP 402, the Agent automatically pays 0.01 HBAR through x402."

接著：

"Once it finds a flight that matches my requirements, I don't need to search again. The Agent sends me an email."

Email：

"I just click Confirm & Book."

最後：

"The only thing that requires me is the final signature."

完成。

18. 最終 Hackathon Value Proposition

不要說：

AI flight search website

而是說：

Autonomous Commerce for AI Agents

AI agents can discover information, pay for APIs, make decisions, and execute transactions — while humans only approve the final purchase.

Hedera 提供：

Fast settlement

Low transaction fees

Native token payments

x402 payment infrastructure

因此整個產品可以變成：

AI Agent
    ↓
Discover
    ↓
Pay
    ↓
Decide
    ↓
Notify
    ↓
Human Approval
    ↓
Execute

這才是整個 Hackathon Demo 最值得展示的核心。 English and makesure that the frontend looks attractive web3 design and easy to understand. don't put too much words on it

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ec84406-16bb-41ca-b60f-4a6df83ff500).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
