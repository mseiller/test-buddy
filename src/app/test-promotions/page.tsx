'use client';

import React, { useState } from 'react';
import PaywallModal from '@/components/PaywallModal';

export default function TestPromotionsPage() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Test Buddy Promotions Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Available Promotional Codes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-blue-600">Family Lifetime Pro</h3>
              <p className="text-sm text-gray-600 mb-2">100% off forever</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">BUDDYFAMILY2025</code>
              <p className="text-xs text-gray-700 mt-1">10 uses available</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-green-600">Student 7-Day Trial</h3>
              <p className="text-sm text-gray-600 mb-2">7 days free, then $5/month</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">STUDENT7DAY</code>
              <p className="text-xs text-gray-700 mt-1">100 uses available</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-purple-600">Pro 7-Day Trial</h3>
              <p className="text-sm text-gray-600 mb-2">7 days free, then $15/month</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">PRO7DAY</code>
              <p className="text-xs text-gray-700 mt-1">100 uses available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test the Paywall Modal</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to test the new promotional features:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mb-6">
            <li>Coupon code validation (try BUDDYFAMILY2025, STUDENT7DAY, or PRO7DAY)</li>
            <li>7-day free trial checkbox</li>
            <li>Dynamic button text based on trial selection</li>
            <li>Real-time coupon validation feedback</li>
          </ul>
          
          <button
            onClick={() => setShowPaywall(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Paywall Modal
          </button>
        </div>

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          currentPlan="free"
          userId="test-user-123"
          triggerFeature="test"
        />
      </div>
    </div>
  );
}
