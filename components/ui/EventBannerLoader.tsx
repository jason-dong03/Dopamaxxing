'use client'

import { useEffect, useState } from 'react'
import EventBanner from './EventBanner'
import type { DailyEvent } from '@/lib/dailyEvents'

type EventWithExpiry = DailyEvent & { expiresAt: string }

export default function EventBannerLoader() {
    const [events, setEvents] = useState<EventWithExpiry[]>([])

    useEffect(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(setEvents)
            .catch(() => {})
    }, [])

    return <EventBanner events={events} />
}
