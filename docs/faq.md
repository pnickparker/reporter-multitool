# Mobile News Bureau — frequently asked questions

*Draft 2026-10-14. Answers reflect how the app works today and what the vendors say publicly as of this date; vendor policies change, so re-check before relying on them. `[support email]` is a placeholder.*

## The basics

**What is it?**
A phone-friendly tool for reporters. You capture a recording, photo or note; it gives you a transcript, the best quotes (checked against the transcript) and draft social posts.

**Do I need to install anything?**
No. It's a web page. For an app-like icon, use *Add to Home Screen* in your phone's browser.

**Does it work on Android?**
It's built to. The iPhone is the best tested; Android testers are still giving us feedback. Tell us what you see.

**What can I upload?**
Video, audio, photos, PDFs and typed notes. Word documents aren't supported yet.

**How long can a recording be?**
Roughly 40 minutes of video or 1½ hours of audio is processed automatically. Longer or bigger files are saved safely and show **Saved, not transcribed**; tap **Transcribe now** to try. File *size* matters as much as length (4K video is huge).

**Why did my video stop by itself at about 10 minutes?**
Clips recorded with the in-app camera can stop at about 10 minutes on an iPhone. That's the phone's limit, not an error, and the clip is saved and uploads as normal. Start another clip to keep going. For longer interviews, record with your device's own camera or voice recorder, then tap **Upload**.

**How long does it take?**
A short clip takes a minute or two. A long interview takes a few minutes. You can close the app while it works.

## Accuracy and trust

**Is the transcript always right?**
No. Transcripts are very good on clear speech and worse on crosstalk, noise, accents, names, numbers and unusual words. Check anything you'll publish against the audio.

**Could the AI invent a quote?**
The app has a safeguard: every quote is checked against the transcript. A quote whose words weren't said is dropped; one with some skipped words is repaired to the exact words (and labelled **Adjusted**). Quoted passages in social post drafts are checked the same way, and a draft with wording that isn't in the transcript is flagged **Check before posting**.
That protects against *wrong words*. It can't judge **context or fairness**, or errors in the transcript itself. You are still the editor.

**How are quotes chosen and scored?**
The AI picks lines it judges quotable and scores them. It's a suggestion. A quiet interview may have few strong quotes; that's the interview, not a bug.

**The speaker labels are wrong. What do I do?**
Tap **Re-run…** under the transcript and choose how many people were talking, or tap a speaker's name to rename them. Both are meant to be quick.

**Can I edit the transcript?**
Not yet. You can rename speakers and re-run. (Tell us if editing matters to you.)

## Your recordings and your data

**Who owns what I record?**
You and your news organization. We don't claim ownership of your recordings, transcripts or drafts. That's a founding principle of the product.

**Where is my recording stored?**
In Google Drive, in a folder the app uses. The transcript, quotes and posts are stored in the app's database.

**Who else sees my recordings?**
To make a transcript the audio goes to a transcription service (AssemblyAI); to find quotes and write drafts, the transcript text goes to an AI service (Anthropic). The app's operator can technically access stored data to run and fix the service.

**Do those companies keep or train on my material?**
- *Transcription (AssemblyAI):* the app deletes their copy of the transcript right after ours is saved. Their stated practice is that uploaded audio is removed on a short schedule (within about one to two days) and that they don't currently train on customer data, though their terms permit it unless you opt out. We're pursuing an opt-out.
- *AI (Anthropic):* their stated policy is that data sent through their business API isn't used to train models without permission. How long they keep it by default isn't spelled out clearly in what we've read; we're confirming it.

These are vendor statements as of October 2026 and can change. We'll update this answer when they do.

**Can I delete things?**
Yes — a recording or a whole project, from its page. That removes the recording, transcript, quotes and posts from the app.

**Can I take my work with me?**
Yes. **Share** sends you the original files; **Export text** gives you the transcript, quotes and posts. Your originals sit in the Drive folder the app created.

**Could I use my own storage?**
We're exploring letting a newsroom keep recordings in its own cloud storage. It's not available yet. If this matters to you, tell us — it shapes what we build.

**Is it safe for confidential sources?**
Treat it like any cloud tool. A recording leaves your phone and passes through several services. For material where a leak could endanger someone, follow your newsroom's rules for sensitive material and don't upload it until you've asked.

## Recording people

**Do I need permission to record?**
Laws vary by state and situation. Some require everyone's consent; others only one party's. When in doubt, say you're recording and get a clear yes on the recording, and follow your newsroom's policy and the stricter state's rule. This isn't legal advice.

## Things that go wrong

**My video stopped by itself while I was recording.**
Usually the phone locked its screen. The big circle asks the phone to keep the screen on while you record, but **Low Power Mode** can override that and lock the screen after 30 seconds. Turn it off before you shoot (if Auto-Lock is greyed out in Settings → Display & Brightness, it's on). A call or alarm can also end a recording; Do Not Disturb or a Focus keeps those out. If a video stops short, keep the clip instead of tapping Retake. What was recorded is still there.

**My upload says "Try again."**
Tap it. It picks up where it stopped. Don't re-record.

**I lost signal in the middle of an upload.**
It retries on its own and resumes. A copy is kept on your phone until the upload finishes. If you quit the app, open it and tap **Resume upload**.

**My photo/video from the in-app camera isn't in my Photos.**
By design it goes to the app. Use **Save to phone** if you want a copy in Photos too.

**It says "Saved, not transcribed."**
The file is above the automatic limit. It's safe. Tap **Transcribe now** to try anyway.

**Processing failed.**
Your recording is safe. Tap **Transcribe now** or **Re-run**. If it fails again, email **[support email]** with the exact words on the screen.

**Share video didn't work.**
Very large videos can't be sent with Share. Use **Open in Drive**.

**Playing a quote starts a moment late on a big video.**
A large video can take a few seconds to load; you'll see "Loading".

## Cost and plans

**What does it cost?**
During the test it's free. Pricing hasn't been set. We'll tell testers before anything changes.

## Getting help

Email **[support email]**. Tell us what you were doing, the exact words on the screen (or a screenshot), and roughly when. We read everything.
