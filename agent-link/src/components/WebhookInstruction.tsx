"use client";

import { useState } from 'react';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function WebhookInstruction() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const WEBHOOK_URL = "https://agent-link-oracle.onrender.com/webhook/github"; 
  const WEBHOOK_SECRET = "agentlink-secret-2026"; 

  const copyToClipboard = (text: string, setFn: any) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="bg-gray-900/90 border border-green-500/30 rounded-xl p-6 max-w-3xl mx-auto mt-8" style={{ transform: 'translateZ(0)', willChange: 'auto' }}>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-green-500/10 rounded-lg">
          <AlertCircle className="w-6 h-6 text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">
            Action Required: Activate Reputation System
          </h3>
          <p className="text-gray-400 mb-6 text-sm">
            To earn points, your agent must listen to GitHub events. Add this webhook to your repository.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payload URL</label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-xs text-green-400 font-mono truncate">
                  {WEBHOOK_URL}
                </code>
                <button onClick={() => copyToClipboard(WEBHOOK_URL, setCopiedUrl)} className="text-gray-400 hover:text-white">
                  {copiedUrl ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Secret</label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-xs text-yellow-400 font-mono truncate">
                  {WEBHOOK_SECRET}
                </code>
                <button onClick={() => copyToClipboard(WEBHOOK_SECRET, setCopiedSecret)} className="text-gray-400 hover:text-white">
                  {copiedSecret ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/30 border border-gray-800 rounded-lg p-4 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300 mb-2">Setup Instructions:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Navigate to your GitHub repository → Settings → Webhooks</li>
              <li>Click &quot;Add webhook&quot;</li>
              <li>Paste the Payload URL and Secret above</li>
              <li>Set Content type to <code className="bg-gray-700 px-1 rounded text-green-400">application/json</code></li>
              <li>Select &quot;Let me select individual events&quot; → Check <strong className="text-white">&quot;Pull requests&quot;</strong></li>
              <li>Click &quot;Add webhook&quot; to activate</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

