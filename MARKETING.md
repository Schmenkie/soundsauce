# SoundSauce Marketing Playbook

## The One-Liner
> "Upload a sound, get a free Vital preset that recreates it."

Use this everywhere. It's the only explanation most people need.

---

## Reddit Strategy

### Rules of Engagement
- **Never post to multiple subreddits on the same day.** Mods cross-check and will flag you as spam. Space posts 2-3 days apart.
- **90/10 rule.** 90% of your Reddit activity should be genuinely helping others (answering sound design questions, giving feedback). 10% can reference SoundSauce.
- **Stay in every thread you post.** Answer every comment for at least 2-3 hours. Posts where OP disappears get downvoted and reported.
- **Lead with value, not pitch.** Give people something useful (presets, knowledge, a demo). The tool is secondary.
- **Never use the same title/body across subreddits.** Customize for each community's culture.

### Subreddit Priority Order

#### 1. r/VitalSynth (~15K members) — START HERE
**Why first:** Small, friendly community built around sharing Vital presets. Lowest risk, highest relevance. Every member uses Vital.

**Self-promo rules:** Relaxed. The community exists to share Vital-related content.

**Post template:**
```
Title: I built a tool that generates Vital presets from any audio — here are some it made

Body:
Hey! I've been working on a tool called SoundSauce that analyzes audio
and generates matching Vital presets. You upload a sound, it figures out
the waveform, filter, ADSR, and modulation, then builds a .vital preset
you can download.

Here are a few examples it generated:
- [808 Bass] — deep sub with pitch envelope
- [Supersaw Lead] — detuned saw stack with chorus
- [Ambient Pad] — slow attack, filtered, with reverb

You can try it free at soundsauce.app — no account needed to analyze.

I'd love feedback from actual Vital users. What sounds would you want
to throw at it?
```

**Key:** Attach or link actual .vital preset files people can download immediately.

---

#### 2. r/edmproduction (~430K members) — HIGH VALUE, STRICT RULES
**Self-promo rules:** BANNED in main feed. Self-promotion = 1-day ban + warning. Use the **monthly Marketplace Thread** for explicit promo.

**Two approaches:**

**Approach A — Marketplace Thread (safe, explicit promo):**
```
Title: [Tool] SoundSauce — upload audio, get a free Vital preset that recreates it

Body:
Hey producers, I built SoundSauce (soundsauce.app) — a free tool that
analyzes any audio and generates a Vital synth preset matching the sound.

How it works:
1. Upload a WAV/MP3 (or use the demo sound)
2. It detects the instrument, waveform type, filter, ADSR, and modulation
3. Download a .vital preset that approximates the sound
4. Fine-tune with built-in sliders

Free tier: 10 analyses/month, 2 stem separations
Pro ($10/mo): unlimited everything

Try it: soundsauce.app (no account needed to start)

Happy to answer any questions about how the analysis works.
```

**Approach B — Organic value post (main feed, no direct promo):**
```
Title: I reverse-engineered how [famous sound] was made — here's the
breakdown

Body:
[Genuine sound design breakdown of an iconic sound using SoundSauce
output as the basis. Include actual frequency analysis, waveform type,
filter settings, ADSR values, and step-by-step Vital recreation
instructions.]

[At the bottom, casually:] "I used a tool I've been working on to pull
the analysis data — happy to share more about the process if anyone's
interested."
```
**Warning:** If this reads as promotion, it will be removed. The breakdown must be genuinely educational and standalone-useful without the tool.

---

#### 3. r/synthesizers (~210K members) — MESSAGE MODS FIRST
**Self-promo rules:** Product developers MUST message mods before posting. They're usually supportive if you stay to answer questions.

**Steps:**
1. Send modmail: "Hi, I'm a developer of a free tool called SoundSauce that generates Vital presets from audio analysis. Would it be appropriate to make a post about it? I'll stay to answer all questions."
2. Wait for approval.
3. Post AMA-style.

**Post template (after mod approval):**
```
Title: I built a tool that analyzes audio and generates Vital synth
presets — AMA about the process

Body:
SoundSauce (soundsauce.app) analyzes audio using FFT spectral analysis,
MFCC feature extraction, and AI instrument detection to figure out the
waveform type, filter characteristics, envelope shape, and modulation
of any sound. Then it generates a .vital preset.

Some technical details for the synth nerds:
- Waveform detection via harmonic ratio analysis (odd harmonics = square,
  1/n rolloff = saw, etc.)
- Filter envelope tracked via spectral centroid movement over time
- ADSR extracted from amplitude envelope analysis
- 40 hand-tuned base presets refined by analysis data
- AI instrument detection via Google Gemini for zero-shot classification

It's free to use (10 analyses/month). Ask me anything about the DSP,
the preset generation, or sound analysis in general.
```

**Key:** This community is technical. They'll ask hard questions about your FFT implementation, waveform detection accuracy, and filter analysis. Be ready with real answers.

---

#### 4. r/musicproduction (~800K members) — PARTICIPATE FIRST
**Self-promo rules:** No self-promo in main feed. Use weekly feedback/promotion threads.

**Strategy:** Spend 1-2 weeks answering "how do I make this sound?" questions. When your answer would naturally benefit from SoundSauce, mention it in a comment — not a post.

**Comment template (on relevant threads):**
```
[Genuine, detailed answer to their sound design question first]

I actually built a tool for exactly this kind of thing — it analyzes
audio and generates a Vital preset. Might save you some time:
soundsauce.app
```

---

#### 5. r/WeAreTheMusicMakers (~2M members) — HIGHEST RISK
**Self-promo rules:** STRICT ban on self-promotion. Temp bans common. Only the Weekend Promotion Thread is safe.

**Strategy:** Do NOT post about SoundSauce directly. Build reputation by participating in discussions for 2-4 weeks first. Only mention the tool in comments when genuinely relevant.

---

## Post Scheduling Template

| Day | Subreddit | Type | Status |
|-----|-----------|------|--------|
| Day 1 | r/VitalSynth | Value post + presets | |
| Day 3 | r/edmproduction | Marketplace thread | |
| Day 5 | r/synthesizers | AMA (after mod approval) | |
| Day 7+ | r/musicproduction | Comment engagement | |
| Day 14+ | r/WeAreTheMusicMakers | Comment engagement | |

---

## Content Preparation Checklist

Before posting, have these ready:

### Screenshots / Assets
- [ ] Screenshot of analysis output (a recognizable sound like an 808 or supersaw)
- [ ] Screenshot showing the Vital preset download flow
- [ ] Screenshot of the preset loaded in Vital (proves it actually works)
- [ ] 2-3 downloadable .vital preset files (generate from demo or well-known sounds)

### Talking Points (for comments)
- **"How is this different from preset packs?"** — "Preset packs are generic. SoundSauce analyzes YOUR specific audio and generates a preset matched to that exact sound."
- **"How accurate is it?"** — "It works best on isolated sounds (single instruments, stems). For full mixes, it has stem separation to isolate parts first. Short 2-5 second clips of a specific sound get the best results."
- **"Why Vital?"** — "Vital is free and open-source, so anyone can use the presets without buying anything. We have 40 hand-tuned base presets that get refined by the analysis."
- **"Is it free?"** — "Yes, 10 analyses/month free, no account needed to try it. Pro is $10/mo for unlimited."
- **"What about [Serum/Splice/YouTube]?"** — "Those are great for learning general synthesis. SoundSauce is specifically for 'I hear THIS exact sound and want to recreate it' — it's personalized to your audio, not generic content."

### Response to Negative Feedback
- **"This doesn't sound exactly like the original"** — "You're right, it's an approximation — a starting point. The idea is to get you 70% there in seconds instead of spending an hour tweaking from scratch. The tuning sliders let you refine from there."
- **"AI-generated presets are gimmicky"** — "Fair concern. The presets aren't purely AI-generated — they're hand-tuned base presets (40 of them) that get selected and adjusted based on the analysis. Think of it as 'smart preset matching' more than 'AI generation.'"

---

## Metrics to Track

After posting, monitor in PostHog:
- **Homepage visits** — are people clicking through?
- **Demo sound plays** — are they trying the tool?
- **Analysis completions** — are they uploading their own audio?
- **Sign-ups** — conversion from visitor to account
- **Preset downloads** — the money metric

Check PostHog the morning after each post for traffic spikes correlated to the subreddit.

---

## Future Channels (after Reddit validation)

### Instagram (Week 2-3)
- Still image carousel: "How [famous sound] was made" with analysis screenshots
- 1080x1080 square format
- Link in bio to soundsauce.app

### TikTok (Week 3-4)
- Screen recording: upload sound → get preset → load in Vital → play
- 15-30 second format
- "POV: you hear a sound and recreate it in 30 seconds"

### Product Hunt (Week 4+)
- Only after you have some user testimonials / usage data
- Gallery images showing the workflow
- Launch on Tuesday-Thursday for best visibility

### Vital Forum (vital.audio)
- Share presets directly on the Vital community forum
- Link back to SoundSauce as the source

---

## Community Feedback & Framing

Real quotes and framing from users that resonate. Use these for marketing copy, landing page social proof, and ad creatives.

### r/VitalSynth (Mar 24, 2026) — First Comment

**User quote:**
> "I think this is really great for learning synthesis. If it works as well as described people can drop in a sound and tune what pieces construct that final product; as in a learning resource that goes sooooo much further than any YouTube tutorial might. Can invent and process things after that."

**Key framing to reuse:**
- "A learning resource that goes further than any YouTube tutorial" — positions SoundSauce as an educational tool, not just a preset generator
- "Drop in a sound and tune what pieces construct that final product" — describes the core UX perfectly in user language
- "Can invent and process things after that" — emphasizes that SoundSauce teaches, not replaces creativity

**Our response framing (Spencer):**
> "I was fairly new to production and sound design so I wanted to find a way to learn and also access sounds that might otherwise cost a lot of money. I graduated from school not that long ago and sample packs/plugins/music equipment in general is just so expensive."

**Key angles from our response:**
- **Relatable origin story** — built by a beginner for beginners, not a PhD audio engineer
- **Cost barrier** — sample packs, plugins, and gear are expensive; SoundSauce is the free alternative
- **Recent grad angle** — resonates with students and young producers on a budget
- **"Learn AND access"** — dual value prop: education + free presets

### Reusable Copy Snippets
- "Learn synthesis faster than any YouTube tutorial"
- "Drop in a sound. See what makes it tick."
- "Built by a broke recent grad who couldn't afford sample packs"
- "Free Vital presets + learn how they're made"
- "The learning resource that goes further than tutorials"
