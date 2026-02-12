# 🚗 Instant Carpool - Blockchain-Powered Ride Sharing

Instant Carpool is a decentralized ride-sharing platform built on the **ICP Blockchain**. It enables users to instantly find and share rides in a secure, transparent, and cost-effective manner, eliminating intermediaries and ensuring fair transactions.

## 🌟 Key Features
- **Decentralized & Secure** – Powered by **ICP Blockchain** for trustless transactions.
- **Instant Matching** – Find or offer rides instantly with smart contract automation.
- **Transparent Payments** – Pay and receive payments using blockchain-native tokens.
- **Identity Verification** – Secure login with **Internet Identity & Plug Wallet**.
- **No Middlemen** – Reduced costs and improved efficiency.

## 🛠️ Tech Stack
- **Frontend:** React.js, JavaScript
- **Backend:** Rust (Canistors)
- **Blockchain:** Internet Computer Protocol (ICP)
- **Wallet Integration:** Plug Wallet & Internet Identity
- **Tools:** DFX SDK, Candid, Truffle

## 🏆 The Problem It Solves
Traditional ride-sharing platforms charge high fees and rely on central authorities for payments and dispute resolution. **Instant Carpool** solves this by leveraging **blockchain technology** to ensure **fair pricing, decentralized control, and instant settlements.**

## 🚀 Getting Started
### 1️⃣ Prerequisites
- Install **DFX SDK**: `dfx version` (Ensure it's installed)
- Install **Node.js** & **npm**
- Install **Plug Wallet** (if using Plug authentication)

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/your-repo/instant-carpool.git
cd instant-carpool
```

### 3️⃣ Start the Local ICP Network
```bash
dfx start --clean --background
```

### 4️⃣ Deploy Canisters Locally
```bash
dfx deploy
```

### 5️⃣ Run the Frontend
```bash
npm install
npm run dev
```

## 🌍 Deploying to ICP Mainnet
### 1️⃣ Authenticate with ICP
```bash
dfx identity new my-identity
dfx identity use my-identity
dfx ledger create-canister my-wallet
```

### 2️⃣ Deploy Canisters
```bash
dfx deploy --network ic
```

### 3️⃣ Verify Deployment
```bash
dfx canister --network ic info ridesharing_backend
dfx canister --network ic info ridesharing_frontend
```

## ⚠️ Challenges Faced
- **Signature Errors** – Fixed by proper agent setup.
- **Frontend Build Issues** – Missing Candid files resolved with `dfx generate`.
- **Wallet Integration Bugs** – Debugged Plug authentication issues.
- **Mainnet Deployment Issues** – Resolved identity and permission errors.

## 📜 License
This project is licensed under the **MIT License**.

## 🤝 Contributors

- **Support** – Vishwas Chaurasia

- 🌐 Website: https://w2lgq-ayaaa-aaaai-q3vvq-cai.icp0.io/

Turn **Rides into Opportunities** with **Instant Carpool** 🚗💨

# Icp-hackathon
