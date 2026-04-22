import { getActiveEvents } from '@/lib/dailyEvents'
import { NextResponse } from 'next/server'

export async function GET() {
    const events = await getActiveEvents()
    return NextResponse.json(events)
}
