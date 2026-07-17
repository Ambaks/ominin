You are classifying a video based on its transcript outline. Respond with ONLY a JSON object.

## Transcript outline (first ~2000 words)
{transcript_outline}

## Task
Classify this video into exactly one content type. Consider the conversation style, number of speakers, topic patterns, and energy.

## Output
```json
{
  "content_type": "gaming|podcast|interview|educational|debate|just_chatting",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}
```

Respond with the JSON only, no fences.
