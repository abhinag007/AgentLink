import fs from 'fs';
import bs58 from 'bs58'; // Make sure to run: npm install bs58

// 🔴 PASTE YOUR PHANTOM PRIVATE KEY INSIDE THE QUOTES BELOW 🔴
const PHANTOM_KEY = "4cxe7AyVmqHAF199rPZmvNvKnSK3d43HrbBmkMecwRj91SjGdXAksDh8B6RC9Nfj2Qskk94EpRhjhXyoVwrJJyNC";

try {
  const secretKey = bs58.decode(PHANTOM_KEY);
  const keyArray = Array.from(secretKey);
  
  // Write to the root directory (../video-wallet.json) so .env can find it easily
  fs.writeFileSync('./video-wallet.json', JSON.stringify(keyArray));
  
  console.log("✅ Success! Created 'video-wallet.json'");
  console.log("👉 Now update your .env file to: ANCHOR_WALLET='./video-wallet.json'");
} catch (e) {
  console.error("❌ Error:");
  console.error(e);
}