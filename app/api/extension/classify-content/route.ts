import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { NextResponse } from 'next/server'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_CLASSIFY_MODEL ?? 'llama-3.3-70b-versatile'

export const POST = withExtensionAuth(async (_ctx, request) => {
    const { url, title, text } = await request.json() as {
        url?: string
        title?: string
        text?: string
    }

    const apiKey = process.env.GROQ_API_KEY
    // No API key → fail open so study sessions aren't blocked
    if (!apiKey) return NextResponse.json({ is_lecture: true })

    const prompt = `You are a classifier for a study-productivity app.

Given this web page, decide if it is genuine lecture or study material a student should be credited for studying.

URL: ${url ?? ''}
Title: ${title ?? ''}
Content preview:
${(text ?? '').slice(0, 700)}

Answer with only one word: "yes" if this is a lecture, course notes, study guide, textbook, academic paper, quiz, or similar educational content — "no" for anything else (social media, entertainment, shopping, random documents, etc.).`

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 5,
                temperature: 0,
            }),
        })

        if (!res.ok) return NextResponse.json({ is_lecture: true })

        const data = await res.json() as { choices?: { message?: { content?: string } }[] }
        const answer = data.choices?.[0]?.message?.content?.toLowerCase().trim() ?? ''
        return NextResponse.json({ is_lecture: answer.startsWith('yes') })
    } catch {
        return NextResponse.json({ is_lecture: true })
    }
})
