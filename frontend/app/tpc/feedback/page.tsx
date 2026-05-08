'use client'

import { TPCLayout } from '@/components/layouts/TPCLayout'
import { FeedbackAnalytics } from '@/components/feedback/FeedbackAnalytics'

export default function CollegeTPCFeedbackPage() {
  return (
    <TPCLayout>
      <div className="p-6 lg:p-8">
        <FeedbackAnalytics
          apiBase="tpc-college"
          title="Student Pulse — College-Wide Feedback"
        />
      </div>
    </TPCLayout>
  )
}
