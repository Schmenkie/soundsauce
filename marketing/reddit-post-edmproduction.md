# Reddit Post Draft — r/edmproduction (Marketplace Thread)

## BEFORE POSTING:
1. Wait 2-3 days after r/VitalSynth post (don't cross-post same day)
2. Find the current month's **Marketplace Thread** (pinned or search "Marketplace")
3. Have soundsauce.app deployed with the latest version
4. Have the Google Drive preset pack link ready (same one from r/VitalSynth)

---

## Title:

> [Tool] SoundSauce — a community platform for learning sound design by reverse-engineering sounds

---

## Body:

Hey everyone — I built a platform called **SoundSauce** for producers who hear sounds they want to recreate but don't know where to start.

### The idea

We've all been there: you hear a bass, a pad, or a lead in a track and think "how do I make that?" You can watch YouTube tutorials or scroll through preset packs, but nothing is specific to *that exact sound.*

SoundSauce lets you upload the audio, and it breaks down exactly what's going on — waveform type, filter envelope, ADSR, modulation, frequency content — then gives you a Vital preset and step-by-step DAW recipe to recreate it.

But the part I'm most excited about is the **community layer on top:**

### What makes it different from just a tool

- **Publish "Sound Sauces"** — break down a sound and share your analysis so other producers can learn from it. Think of it like a community cookbook for synth sounds.
- **Browse and discover** — search Sound Sauces by instrument type, genre tags, or just see what's trending. Every breakdown includes the full analysis + a downloadable Vital preset.
- **Recreation challenges** — weekly community challenges where everyone tries to recreate the same reference sound. Upload your attempt and get a % match score showing how close you got. Leaderboard tracks the best recreations.
- **Follow producers** — see what sounds people in your community are breaking down. Learn from how experienced producers approach sound design.
- **Comment and discuss** — ask questions on any Sound Sauce, share tips, suggest alternative approaches.

### The analysis engine

Under the hood, when you upload audio:
1. Spectral analysis detects waveform type, filter movement, and harmonics
2. AI instrument detection (Google Gemini) identifies what you're working with
3. It matches against 40 hand-tuned Vital presets and lets you fine-tune with sliders
4. Stem separation (Demucs) available for isolating parts from full tracks

### Free to use

- 10 analyses/month on the free tier, no account needed to try it
- Every analysis includes a free .vital preset download
- Pro ($10/mo) unlocks unlimited everything

**Try it:** [soundsauce.app](https://soundsauce.app)

I also put together a **free preset pack** (10 Vital presets — 808, Reese, Supersaw, Acid, FM Lead, Pads, Pluck, Bell, Kick) if you just want to grab some sounds: **[Google Drive link]**

### Looking for feedback

I've been building this solo and would love to hear from the community:
- Would you actually publish a Sound Sauce for others to learn from?
- What sounds would you want to see broken down?
- Would you participate in weekly recreation challenges?
- What's missing that would make this useful for your workflow?

Happy to answer questions about the platform or the analysis tech.

---

## NOTES FOR POSTING:

**Angle:** Community learning platform, NOT "another preset tool." The presets are a feature, not the pitch.

**Why Marketplace Thread:** r/edmproduction bans self-promo in the main feed (1-day ban on first offense). The monthly Marketplace Thread is the safe zone for sharing tools/services.

**Key talking points for comments:**

Someone asks "why would I publish my breakdowns?":
> "Same reason people post tutorials or share presets — to help the community and build a reputation. You get followers, likes, and badges. Eventually we're building a teacher platform where experienced producers can monetize their knowledge."

Someone says "I just use YouTube/Splice/whatever":
> "Those are great for generic sound design learning. SoundSauce is specifically for 'I hear THIS exact sound and want to recreate it.' You get analysis tailored to your specific audio, not a general tutorial. Plus the community breakdowns mean you're learning from how other producers approach the same problem."

Someone asks about accuracy:
> "Works best on isolated sounds — single instruments, stems, or short clips. The preset gets you maybe 70% there as a starting point, then you fine-tune. For full songs, there's built-in stem separation to isolate parts first."

Someone asks "is there actually a community or is it empty?":
> "I just launched, so it's early — there are seed Sound Sauces covering iconic sounds (808, Reese, Supersaw, etc.) but I need real producers contributing. That's honestly why I'm posting here — looking for early members who want to help shape what this becomes."

Someone asks about recreations/challenges:
> "The match scoring uses spectral analysis to compare your recreation against the original — it looks at 6 frequency bands and gives you per-band feedback plus EQ suggestions. The weekly challenges are a way to practice and compete. Think of it like ear training but for synthesis."

**Be honest about being early-stage.** Don't pretend you have a thriving community yet. Frame it as "building something cool, looking for early members."
