# Reddit Post Draft — r/VitalSynth

## BEFORE POSTING:
1. Upload `marketing/SoundSauce-Free-Pack.zip` to Google Drive or Dropbox and set to "Anyone with link can view"
2. Take a screenshot of soundsauce.app analyzing the demo sound (the Cm7 pad)
3. Take a screenshot of one of these presets loaded in Vital
4. Optional: 30-second screen recording of the workflow (upload → analyze → download preset → load in Vital)

---

## Title (pick one):

**Option A (preset-first — recommended):**
> Free Vital preset pack (10 presets) + the tool I built to generate them from any audio

**Option B (tool-first):**
> I built a free tool that analyzes any audio and generates a matching Vital preset

**Option C (curiosity-driven):**
> What if you could upload any sound and get a Vital preset that recreates it?

---

## Body:

Hey everyone! I've been working on a project called **SoundSauce** and wanted to share it here since it's built specifically around Vital.

### What it does
You upload any audio file (a bass hit, a lead, a pad, whatever), and it analyzes the sound — waveform type, filter characteristics, ADSR envelope, modulation, harmonics — then matches it to a Vital preset and lets you download the .vital file.

### Free preset pack
I generated 10 presets to share with you all. These are the same presets available in the tool, packaged up for easy download:

**[Download link — SoundSauce Free Pack (10 presets)]**

What's included:
- **808 Bass** — deep sub with pitch envelope
- **Reese Bass** — detuned saws, dark and heavy
- **Acid Bass** — resonant filter, TB-303 style
- **Supersaw Lead** — wide detuned unison stack
- **FM Lead** — metallic FM harmonics
- **Warm Pad** — slow attack, filtered, lush
- **Dark Pad** — low-passed, atmospheric
- **Soft Pluck** — quick decay, gentle attack
- **Bell** — FM-style, glassy harmonics
- **Analog Kick** — punchy with pitch sweep

All free, no strings attached. Use them however you want.

### How the tool works
The interesting part is the analysis engine behind it. When you upload audio, SoundSauce:

1. Runs FFT spectral analysis to detect the waveform type (saw, square, sine, etc.)
2. Tracks the spectral centroid over time to detect filter movement
3. Extracts the amplitude envelope for ADSR values
4. Detects modulation (LFO, vibrato, chorus/detune)
5. Uses AI (Google Gemini) for instrument classification
6. Matches against 40 curated Vital presets and lets you fine-tune with sliders

It works best on isolated sounds — single instruments, stems, or short clips. For full songs, there's built-in stem separation (Demucs) so you can isolate bass/drums/vocals/other first.

**Try it:** [soundsauce.app](https://soundsauce.app) — no account needed, 10 free analyses per month.

### What I'm looking for
Honest feedback. I've been building this solo and I'm too close to it at this point. Some things I'm wondering:

- Are the presets actually useful starting points, or do they need more work?
- What sounds would you want to throw at it?
- Is the UI intuitive or confusing?
- What would make this more useful for your workflow?

Happy to answer any questions about how the analysis works under the hood.

---

## NOTES FOR POSTING:

**Tone:** Casual, community-member sharing a project. NOT a product launch announcement.

**Key things to do:**
- Upload the preset zip to Google Drive/Dropbox BEFORE posting
- Stay in the thread for 2-3+ hours answering every comment
- If someone says "this preset sounds wrong" — agree, ask what they'd change, take notes
- If someone asks about accuracy — be honest: "It's a starting point, not a perfect clone. Gets you maybe 70% there"

**Things NOT to do:**
- Don't mention pricing/Pro tier unless someone asks
- Don't link to other subreddits
- Don't edit the post to add "wow this blew up" type edits
- Don't argue with criticism — thank people for feedback

**Replies to have ready:**

Someone says "these presets are pretty basic":
> "Fair — they're meant as starting points that get refined by the analysis. The real value is when you upload YOUR audio and it matches + tweaks the preset to your specific sound. The standalone presets are more of a sampler."

Someone asks "how is this different from just downloading preset packs?":
> "Preset packs are generic — you browse and hope something fits. SoundSauce analyzes your specific audio and picks the closest match. So if you hear a bass in a song and want to recreate it, you upload that clip and get a preset tailored to that exact sound."

Someone asks about the tech stack:
> "React frontend, Web Audio API + Web Workers for the DSP, Google Gemini for AI instrument detection, Demucs for stem separation. The FFT analysis, MFCC extraction, and spectral matching all run client-side in the browser. Presets are 40 hand-tuned .vital files that get selected and adjusted based on the analysis."

Someone asks if it's open source:
> "Not currently, but the presets themselves are free to use and share."
