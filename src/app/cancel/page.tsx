'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-8 w-8 text-orange-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges have been made to your account. You can try again anytime or continue using Test Buddy with the free plan.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Test Buddy</span>
            </button>
            
            <p className="text-sm text-gray-500">
              Need help? Contact us at support@yourbuddyapps.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
